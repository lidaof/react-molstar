/* eslint-disable @typescript-eslint/consistent-type-assertions */
/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { createPlugin, DefaultPluginSpec } from "molstar/lib/mol-plugin";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { AnimateUnitsExplode } from "molstar/lib/mol-plugin-state/animation/built-in/explode-units";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import { ObjectKeys } from "molstar/lib/mol-util/type-helpers";
import { PluginLayoutControlsDisplay } from "molstar/lib/mol-plugin/layout";
import { G3DFormat, G3dProvider, G3DHeaderFromUrl, G3DTrajectory } from "molstar/lib/extensions/g3d/format";
import { g3dHaplotypeQuery, G3dInfoDataProperty, g3dChromosomeQuery, g3dRegionQuery } from "molstar/lib/extensions/g3d/model";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { DataFormatProvider } from "molstar/lib/mol-plugin-state/formats/provider";
import { stringToWords } from "molstar/lib/mol-util/string";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { CustomColoring } from './CustomColoring';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
// import { StructureQualityReport, StructureQualityReportProvider } from './prop';
// import { StructureQualityReportColorThemeProvider } from './color';
require("molstar/lib/mol-plugin-ui/skin/light.scss");

const CustomFormats = [["g3d", G3dProvider] as const];

const Extensions = {
    g3d: PluginSpec.Behavior(G3DFormat),
};

const DefaultViewerOptions = {
    customFormats: CustomFormats as [string, DataFormatProvider][],
    extensions: ObjectKeys(Extensions),
    layoutShowControls: true,
    layoutIsExpanded: false,
    layoutShowLeftPanel: true,
    layoutControlsDisplay: "reactive" as PluginLayoutControlsDisplay,
    layoutShowSequence: false,
    viewportShowExpand: false,
};
type ViewerOptions = typeof DefaultViewerOptions;
type InitParams = {
    url: string;
    resolution?: number;
};

// // decor data from bigwig
// const dataString= '[{"start":25965714,"end":26139927,"maxScore":19,"minScore":1,"score":3.9397347174163784,"summary":true},{"start":26139927,"end":26309828,"maxScore":17,"minScore":1,"score":3.2915592018537168,"summary":true},{"start":26310249,"end":26484408,"maxScore":21,"minScore":1,"score":3.499476881048563,"summary":true},{"start":26484408,"end":26657459,"maxScore":16,"minScore":1,"score":3.2946793131412857,"summary":true},{"start":26657459,"end":26830010,"maxScore":15,"minScore":1,"score":2.4913912459971628,"summary":true},{"start":26831353,"end":27003697,"maxScore":12,"minScore":1,"score":2.037647808406574,"summary":true},{"start":27003762,"end":27170460,"maxScore":22,"minScore":1,"score":2.4929279958312396,"summary":true},{"start":27171122,"end":27339367,"maxScore":18,"minScore":1,"score":2.355886612869853,"summary":true},{"start":27339851,"end":27507620,"maxScore":13,"minScore":1,"score":2.05276634485898,"summary":true}]';
// const bwData = JSON.parse(dataString)
// console.log(bwData);

class Molstar3D {
    plugin: PluginContext;
    chrom3dComponents: any;
    region3dComponents: any;
    chromSelectionSelector: any;
    chromReprSelector: any;
    regionSelectionlSelector: any;
    structure: any;
    builder: any;
    model: any;
    trajectory: any;
    customColoring: any;

    constructor(target: HTMLElement, options: Partial<ViewerOptions> = {}) {
        const o = { ...DefaultViewerOptions, ...options };
        this.plugin = createPlugin(target, {
            ...DefaultPluginSpec,
            actions: [],
            layout: {
                initial: {
                    isExpanded: o.layoutIsExpanded,
                    showControls: o.layoutShowControls,
                    controlsDisplay: o.layoutControlsDisplay,
                },
                controls: {
                    ...(DefaultPluginSpec.layout && DefaultPluginSpec.layout.controls),
                    right: "none",
                    top: o.layoutShowSequence ? undefined : "none",
                    bottom: "none",
                    left: o.layoutShowLeftPanel ? undefined : "none",
                },
            },
            behaviors: [...DefaultPluginSpec.behaviors, ...o.extensions.map((e) => Extensions[e])],
            animations: [AnimateUnitsExplode],
            config: [[PluginConfig.Viewport.ShowExpand, o.viewportShowExpand]],
            components: {
                remoteState: "none",
            },
        });
        
    }

    async init(params: InitParams) {
        return this.plugin.dataTransaction(async () => {
            this.plugin.behaviors.layout.leftPanelTabName.next("data");
            this.plugin.representation.structure.themes.colorThemeRegistry.add(CustomColoring.colorThemeProvider!);
            this.plugin.managers.lociLabels.addProvider(CustomColoring.labelProvider!);
            this.plugin.customModelProperties.register(CustomColoring.propertyProvider, true);

            // this.plugin.representation.structure.themes.colorThemeRegistry.add(StructureQualityReportColorThemeProvider);

            // console.log(StructureQualityReportColorThemeProvider)

            this.trajectory = await this.plugin
                .build()
                .toRoot()
                .apply(G3DHeaderFromUrl, { url: params.url })
                .apply(G3DTrajectory, { resolution: params.resolution })
                .commit();

            this.builder = this.plugin.builders.structure;
            this.model = await this.builder.createModel(this.trajectory);
            
            if (!this.model) return;
            this.structure = await this.builder.createStructure(this.model);

            const info = G3dInfoDataProperty.get(this.model.data!);
            if (!info) return;

            const components = this.plugin.build().to(this.structure);

            const repr = createStructureRepresentationParams(this.plugin, void 0, {
                type: 'cartoon',
                color: 'polymer-index',
                size: 'uniform',
                sizeParams: { value: 0.25 },
                typeParams: { alpha: 0.1 }
            });
        
            for (const h of info.haplotypes) {
                components
                    .apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: g3dHaplotypeQuery(h), label: stringToWords(h) })
                    .apply(StateTransforms.Representation.StructureRepresentation3D, repr);
            }
            await components.commit();
        });
    }

    showChrom3dStruct = async (chrom: string) => {
        // show struct of chromosome
        const reprChrom = createStructureRepresentationParams(this.plugin, void 0, {
            type: 'cartoon',
            color: 'polymer-index',
            size: 'uniform',
            sizeParams: { value: 0.25 },
            typeParams: { alpha: 0.2 }
        });
        
        if(this.chromSelectionSelector) {
            // remove first
            PluginCommands.State.RemoveObject(this.plugin, {state: this.plugin.state.data, ref: this.chromSelectionSelector})
        }
        this.chrom3dComponents = this.plugin.build().to(this.structure);
        const chromSelection = this.chrom3dComponents.apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: g3dChromosomeQuery(chrom), label: chrom });
        this.chromSelectionSelector = chromSelection.selector;
        this.chromReprSelector = chromSelection.apply(StateTransforms.Representation.StructureRepresentation3D, reprChrom).selector;
        await this.chrom3dComponents.commit()
        
    }

    showRegion3dStruct = async (chrom: string, start: number, end: number) => {
        // show struct of a particular region
        const reprRegion = createStructureRepresentationParams(this.plugin, void 0, {
            type: 'cartoon',
            color: 'polymer-index',
            size: 'uniform',
            sizeParams: { value: 0.25 },
            typeParams: { alpha: 1 }
        });
        if(this.regionSelectionlSelector) {
            // remove first
            PluginCommands.State.RemoveObject(this.plugin, {state: this.plugin.state.data, ref: this.regionSelectionlSelector})
        }
        this.region3dComponents = this.plugin.build().to(this.structure);
        const regionSelection = this.region3dComponents.apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: g3dRegionQuery(chrom, start, end), label: `${chrom}:${start}-${end}` });
        this.regionSelectionlSelector = regionSelection.selector;
        regionSelection.apply(StateTransforms.Representation.StructureRepresentation3D, reprRegion);
        await this.region3dComponents.commit()
    }

    paintChrom3d = async () => {
        const components = this.plugin.build().to(this.structure);
        const colorTheme = { name: CustomColoring.propertyProvider.descriptor.name, params: {...this.plugin.representation.structure.themes.colorThemeRegistry.get(CustomColoring.propertyProvider.descriptor.name).defaultValues, url: 'my test url'} };
        console.log(colorTheme)
        console.log(CustomColoring)
        components.to(this.chromReprSelector).update(StateTransforms.Representation.StructureRepresentation3D, (old:any) => ({ ...old, colorTheme }));
        await components.commit();
    }

    paint2Chrom3d = async () => {
        const components = this.plugin.build().to(this.structure);
        const colorTheme = { name: CustomColoring.propertyProvider.descriptor.name, params: {...this.plugin.representation.structure.themes.colorThemeRegistry.get(CustomColoring.propertyProvider.descriptor.name).defaultValues, url: 'my test url'} };
        console.log(colorTheme)
        components.to(this.chromReprSelector).update(StateTransforms.Representation.StructureRepresentation3D, (old:any) => ({ ...old, colorTheme }));
        await components.commit();
    }

    // decorRegion3d = () => {
    //     console.log(CustomColoring)
    //     const colorTheme = { name: CustomColoring.propertyProvider.descriptor.name, params: this.plugin.representation.structure.themes.colorThemeRegistry.get(CustomColoring.propertyProvider.descriptor.name).defaultValues };
    //     this.components.to(this.regionVisualSelector).update(StateTransforms.Representation.StructureRepresentation3D, (old:any) => ({ ...old, colorTheme }));
            
    // }
}

export default Molstar3D;
