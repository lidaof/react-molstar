import React from "react";
import Molstar3D from "./g3ddemo2";
import { BigwigSource } from './BigwigSource';

import "./App.css";

class App extends React.Component {
    myRef: any;
    myRef2: any;
    demo: any;
    constructor(props: any) {
        super(props);
        this.myRef2 = React.createRef();
    }

    componentDidMount() {
        this.demoG3d();
    }

    demoG3d = async () => {
        this.demo = new Molstar3D(this.myRef2.current);
        await this.demo.init({ url: "https://target.wustl.edu/dli/tmp/test2.g3d" });
        console.log(this.demo);
        // this.demo.showChrom3dStruct('chr7');
        // this.demo.showRegion3dStruct('chr7', 2000000, 7000000);
        // this.demo.decorChrom3d();
        // this.demo.decorRegion3d();
    };

    highlight = () => {
        this.demo.g3dRangeSelection('paternal', 'chr7', 0, 24460000)
    }

    showChrom7 = async () => {
        this.demo.showChrom3dStruct('chr7');
    }

    showChrom8 = async () => {
        this.demo.showChrom3dStruct('chr8');
    }

    showRegion = async () => {
        this.demo.showRegion3dStruct('chr7', 1000000, 8000000);
    }

    paintChrom = async () => {
        this.demo.paintChrom3d();
    }

    paint2Chrom = async () => {
        this.demo.paint2Chrom3d();
    }

    fetchBwData = async () => {
        const bw = new BigwigSource('https://wangftp.wustl.edu/~dli/test/TW463_20-5-bonemarrow_MeDIP.bigWig');
        const bwData = await bw.getData('chr7', 26053398, 27373766, { scale: 1 / 200000 });
        console.log(bwData);
    }

    render() {
        return (
            <div>
                <span>mol* in React</span>
                <div>
                    <button onClick={this.highlight}>highlight</button>
                </div>
                <div>
                    <button onClick={this.showChrom7}>show chromosome 7</button> <button onClick={this.showChrom8}>show chromosome 8</button>
                    {' '}
                    <button onClick={this.paintChrom}>paint chrom custom theme</button>
                    {' '}
                    <button onClick={this.paint2Chrom}>paint chrom full theme</button>
                    {' '}
                    <button onClick={this.fetchBwData}>fetch bigwig data ('chr7',26053398,27373766), resolution 200k</button>
                </div>
                <div>
                    <button onClick={this.showRegion}>show region</button>
                </div>
                <div className="App">
                    <div id="app2" ref={this.myRef2}></div>
                </div>
            </div>
        );
    }
}

export default App;
