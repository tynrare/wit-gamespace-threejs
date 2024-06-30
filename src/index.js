import App from "./app.js";
import { run_inputs } from "./inputs.js";
//import { run_toolbox } from "./toolbox.js";

function main() {
  const app = new App().init().run();
	const canvas = app.render.renderer.domElement;
	//run_inputs(canvas, app);
	//run_toolbox(app);
  window["app"] = app;
}

main();
