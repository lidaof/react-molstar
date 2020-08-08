import React from "react";
import "./App.css";
import LightingDemo from "./lighting";

class App extends React.Component {
    myRef: any;
    constructor(props: any) {
        super(props);
        this.myRef = React.createRef();
    }

    componentDidMount() {
        // const demo = new LightingDemo(this.myRef.current);
        const demo = new LightingDemo("app");
        // demo.init(this.myRef.current);
        demo.load({ url: "https://files.rcsb.org/download/1M07.cif", assemblyId: "1" });

        addHeader("Example PDB IDs");
        addControl("1M07", () => demo.load({ url: "https://files.rcsb.org/download/1M07.cif", assemblyId: "1" }));
        addControl("6HY0", () => demo.load({ url: "https://files.rcsb.org/download/6HY0.cif", assemblyId: "1" }));
        addControl("6QVK", () => demo.load({ url: "https://files.rcsb.org/download/6QVK.cif", assemblyId: "1" }));
        addControl("1RB8", () => demo.load({ url: "https://files.rcsb.org/download/1RB8.cif", assemblyId: "1" }));

        addSeparator();

        addHeader("Lighting Presets");
        addControl("Illustrative", () => demo.setPreset("illustrative"));
        addControl("Standard", () => demo.setPreset("standard"));
        addControl("Ambient Occlusion", () => demo.setPreset("occlusion"));

        ////////////////////////////////////////////////////////

        function $(id: any) {
            return document.getElementById(id);
        }

        function addControl(label: any, action: any) {
            var btn = document.createElement("button");
            btn.onclick = action;
            btn.innerText = label;
            const control = $("controls");
            if (!control) return;
            control.appendChild(btn);
        }

        function addSeparator() {
            var hr = document.createElement("br");
            const control = $("controls");
            if (!control) return;
            control.appendChild(hr);
        }

        function addHeader(header: any) {
            var h = document.createElement("h3");
            h.innerText = header;
            const control = $("controls");
            if (!control) return;
            control.appendChild(h);
        }
    }

    render() {
        return (
            <div className="App">
                <p>mol* in React</p>
                <div id="controls"></div>
                <div id="app" ref={this.myRef}></div>
            </div>
        );
    }
}

export default App;
