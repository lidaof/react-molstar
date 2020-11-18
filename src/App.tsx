import React from "react";
import Molstar3D from "./g3ddemo2";

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
        this.demo.showChrom3dStruct('chr7');
        this.demo.showRegion3dStruct('chr7', 2000000, 7000000);
        // this.demo.decorChrom3d();
        this.demo.decorRegion3d();
        await this.demo.final();
    };

    highlight = () => {
        this.demo.g3dRangeSelection('paternal', 'chr7', 0, 24460000)
    }

    change = async () => {
        this.demo.showRegion3dStruct('chr7', 1000000, 8000000);
        await this.demo.final();
    }

    render() {
        return (
            <div>
                <span>mol* in React</span>
                <div>
                    <button onClick={this.highlight}>highlight</button>
                </div>
                <div>
                    <button onClick={this.change}>change region</button>
                </div>
                <div className="App">
                    <div id="app2" ref={this.myRef2}></div>
                </div>
            </div>
        );
    }
}

export default App;
