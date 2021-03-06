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
import { g3dHaplotypeQuery, G3dInfoDataProperty } from "molstar/lib/extensions/g3d/model";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { DataFormatProvider } from "molstar/lib/mol-plugin-state/formats/provider";
import { stringToWords } from "molstar/lib/mol-util/string";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { Color } from "molstar/lib/mol-util/color";
import { Queries, QueryContext, StructureSelection, Unit } from "molstar/lib/mol-model/structure";
import { StateObjectSelector } from "molstar/lib/mol-state";
import { EmptyLoci } from "molstar/lib/mol-model/loci";
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

class Molstar3D {
    plugin: PluginContext;
    structure: StateObjectSelector | undefined;
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
                viewport: { canvas3d: { renderer: { pickingAlphaThreshold: 0.1, backgroundColor: Color(0xffffff) } } },
            },
        });
        // PluginCommands.Canvas3D.SetSettings(this.plugin, {
        //     settings: (props) => {
        //         props.renderer.pickingAlphaThreshold = 0.1;
        //     },
        // });
        // this.plugin.canvas3d?.setProps((props) => {
        //     props.renderer.pickingAlphaThreshold = 0.1;
        // });
    }

    async init(params: InitParams) {
        return this.plugin.dataTransaction(async () => {
            this.plugin.behaviors.layout.leftPanelTabName.next("data");
            const trajectory = await this.plugin
                .build()
                .toRoot()
                .apply(G3DHeaderFromUrl, { url: params.url })
                .apply(G3DTrajectory, { resolution: params.resolution })
                .commit();

            const builder = this.plugin.builders.structure;
            const model = await builder.createModel(trajectory);

            if (!model) return;
            const structure = await builder.createStructure(model);
            this.structure = structure;
            const info = G3dInfoDataProperty.get(model.data!);
            if (!info) return;

            const components = this.plugin.build().to(structure);

            const repr = createStructureRepresentationParams(this.plugin, void 0, {
                type: "cartoon",
                color: "polymer-index",
                size: "uniform",
                sizeParams: { value: 0.25 },
                // typeParams: { alpha: 0.25 },
            });

            for (const h of info.haplotypes) {
                components
                    .apply(StateTransforms.Model.StructureSelectionFromExpression, {
                        expression: g3dHaplotypeQuery(h),
                        label: stringToWords(h),
                    })
                    .apply(StateTransforms.Representation.StructureRepresentation3D, repr);
            }

            await components.commit();
        });
    }

    getInfo = (ctx: QueryContext) => {
        if (Unit.isAtomic(ctx.element.unit)) return void 0;
        return G3dInfoDataProperty.get(ctx.element.unit.model);
    };

    g3dRangeSelection = (haplotype: string, chromosome: string, start: number, end: number) => {
        if (!this.structure) {
            return;
        }
        const q = Queries.generators.atoms({
            chainTest: (ctx) => {
                const { seq_id_begin, asym_id } = ctx.element.unit.model.coarseHierarchy.spheres;
                const seqId = seq_id_begin.value(ctx.element.element);
                return (
                    this.getInfo(ctx)?.haplotype[seqId] === haplotype &&
                    asym_id.value(ctx.element.element) === chromosome
                );
            },
            residueTest: (ctx) => {
                const { seq_id_begin } = ctx.element.unit.model.coarseHierarchy.spheres;
                const seqId = seq_id_begin.value(ctx.element.element);
                const s = this.getInfo(ctx)?.start[seqId];
                if (s === void 0) return false;
                return start <= s && s < end;
            },
        });
        // const q = Queries.generators.all;
        // structure is the selector from
        // const structure = await builder.createStructure(model);
        const sel = q(new QueryContext(this.structure!.data!));
        const loci = StructureSelection.toLociWithSourceUnits(sel);
        console.log(sel, loci);
        this.plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
    };

    clearSelection = () => {
        // to clear
        this.plugin.managers.interactivity.lociHighlights.highlightOnly({ loci: EmptyLoci });
    };
}

export default Molstar3D;
