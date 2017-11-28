var host = "127.0.0.1", port = "9001"

console.info("injectTracker is here!")

var ws = new WebSocket("ws://" + host + ":" + port)

ws.onopen = function () {
	ws.send("FEED_ME")
}

ws.onmessage = function (evt) {
	var packet = evt.data, packetType = packet[0], packetData = packet.slice(1)
	switch (packetType) {
		case "g": // Gyroscope Event
			var v = packetData.split(" ").slice(1).map(Number)
			var params = {alpha: v[0], beta: v[1], gamma: v[2]}
			window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', params))
			break
		case "a": // Accelerometer Event
			var v = packetData.split(" ").slice(1).map(Number)
			var params = {accelerationIncludingGravity: {x: v[0], y: v[1], z: v[2]}}
			window.dispatchEvent(new DeviceMotionEvent('devicemotion', params))
			break
		case "i": // Message
			console.info("Message from server:", packetData)
			break
		default:
			console.info("Unknown packet from server:", packet)
			break
	}
}

ws.onclose = function () {
	console.info("Disconnected from server")
}
