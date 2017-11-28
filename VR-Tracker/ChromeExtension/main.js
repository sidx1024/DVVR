var port = null
var streamingTabs = []
var tabsList = []

/**
 * Not working, so just copy-paste contents of injectTracker.js into the tab's console.
 * **/
function injectTracker() {
	streamingTabs.map(function (tabId) {
		chrome.tabs.executeScript(tabId, {file: "/injectTracker.js"})
	})
}
function disableTracker() {
	streamingTabs.map(function (tabId) {
		chrome.tabs.executeScript(tabId, {code: "if(ws !== undefined){ ws.disconnect() }"})
	})
}
function updateTabsList() {
	tabsList = []
	chrome.tabs.query({url: ["http://*/*", "https://*/*"]}, function (tabs) {
		tabs.map(function (tab) {
			if (streamingTabs.indexOf(tab.id) === -1) {
				tabsList.push(
					{
						id: tab.id,
						title: tab.title,
						url: tab.url,
						streaming: false
					}
				)
			}
		})

		var tabsListElement = document.querySelector("#tabsList")
		tabsListElement.innerHTML = null
		tabsList.map(function (tab) {
			var tabElement = document.querySelector(".component-repository").querySelector(".tab").cloneNode(true)
			tabElement.querySelector(".title").innerText = tab.title.slice(0, 40) + (tab.title.length > 40 ? "..." : "")
			tabElement.querySelector(".info").innerHTML = tab.id + " &bull; " + tab.url.slice(0, 64) + (tab.url.length > 64 ? "..." : "")
			tabElement.querySelector("label").setAttribute("for", "switch-" + tab.id)
			tabElement.querySelector("label").removeAttribute("data-upgraded")
			componentHandler.upgradeElement(tabElement.querySelector("label"))
			tabElement.querySelector("input").setAttribute("id", "switch-" + tab.id)
			tabElement.querySelector("input").setAttribute("data-tab-id", tab.id)
			tabElement.querySelector("input").addEventListener("change", onTabTouch)
			if (streamingTabs.indexOf(tab.id) > -1) {
				tabsListElement.insertBefore(tabElement, tabsListElement.firstElementChild)
				tabElement.querySelector("input").setAttribute("checked")
			} else {
				tabsListElement.appendChild(tabElement)
			}
		})
	})
}
function onTabTouch(e) {
	var tabId = Number(e.target.getAttribute("data-tab-id"))
	var tabIndex = streamingTabs.indexOf(tabId)
	if (tabIndex > -1) {
		streamingTabs.splice(tabIndex, 1)
	} else {
		streamingTabs.push(tabId)
	}
	console.log(streamingTabs)
}
function appendMessage(text) {
	document.getElementById('response').innerHTML += "<p>" + text + "</p>"
}
function replaceMessage(text) {
	document.getElementById('response').innerHTML = "<p>" + text + "</p>"
}
function updateUiState() {
	if (port) {
		document.getElementById('connect-button').style.display = 'none'
		document.getElementById('input-text').style.display = 'block'
		document.getElementById('send-message-button').style.display = 'block'
	} else {
		document.getElementById('connect-button').style.display = 'block'
		document.getElementById('input-text').style.display = 'none'
		document.getElementById('send-message-button').style.display = 'none'
	}
}
function sendNativeMessage(message) {
	port.postMessage(message)
}
function onNativeMessage(message) {
	if(message === "HANDSHAKE_REQ") {
		replaceMessage("Recieved handshake request.")
		sendNativeMessage("HANDSHAKE_ACK")
		return
	}

	if(message === "HANDSHAKE_COMPLETE") {
		replaceMessage("Connected.<br/> Copy-paste code of injectTracker.js into Web Console of the tab you want to do tracking.")
		return
	}

	replaceMessage(message)
}
function onDisconnected() {
	appendMessage("Failed to connect: " + chrome.runtime.lastError.message)
	port = null
	updateUiState()
	disableTracker()
}
function connect() {
	var hostName = "xyz.siddharth.vrtracker"
	appendMessage("Connecting to native messaging host <b>" + hostName + "</b>")
	port = chrome.runtime.connectNative(hostName)
	port.onMessage.addListener(onNativeMessage)
	port.onDisconnect.addListener(onDisconnected)
	injectTracker()
}
document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('connect-button').addEventListener(
		'click', connect)
	document.getElementById('send-message-button').addEventListener(
		'click', sendNativeMessage)
	updateUiState()
})

chrome.tabs.onUpdated.addListener(updateTabsList)
chrome.tabs.onCreated.addListener(updateTabsList)
chrome.tabs.onRemoved.addListener(updateTabsList)
updateTabsList()
