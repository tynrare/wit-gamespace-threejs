
export function format_time(timestamp) {
	var sec_num = Math.round(timestamp * 1e-3);
	var hours = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - hours * 3600) / 60);
	var seconds = sec_num - hours * 3600 - minutes * 60;

	hours = String(hours).padStart(2, "0");
	minutes = String(minutes).padStart(2, "0");
	seconds = String(seconds).padStart(2, "0");

	const s = hours + ":" + minutes + ":" + seconds;

	return s;
}
