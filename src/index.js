import App from "./app.js";

function main() {
	const container = document.getElementById("approot");
  const app = App.instance.init(container).run();
  window["app"] = app;
}

main();
