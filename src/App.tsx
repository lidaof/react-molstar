import React from "react";
import Molstar3D from "./g3ddemo";

import "./App.css";

class App extends React.Component {
    myRef: any;
    myRef2: any;
    constructor(props: any) {
        super(props);
        this.myRef2 = React.createRef();
    }

    componentDidMount() {
        this.demoG3d();
    }

    demoG3d = () => {
        const demo = new Molstar3D(this.myRef2.current);
        demo.init({ url: "https://target.wustl.edu/dli/tmp/test2.g3d" });
        console.log(demo);
    };

    render() {
        return (
            <div>
                <p>mol* in React</p>
                <div className="App">
                    <div id="app2" ref={this.myRef2}></div>
                </div>
            </div>
        );
    }
}

export default App;
