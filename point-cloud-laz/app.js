/* global document, window,*/
/* eslint-disable no-console */
import React, {PureComponent} from 'react';
import {render} from 'react-dom';
import DeckGL, {PointCloudLayer, COORDINATE_SYSTEM} from 'deck.gl';
import {setParameters} from 'luma.gl';

import {
  OrbitController,
  loadLazFile, parseLazData
} from './utils';
import { setTimeout } from 'timers';

const USE_LOCAL = true;

let DATA_REPO = 'https://raw.githubusercontent.com/uber-common/deck.gl-data/master';
let FILE_PATH = 'examples/point-cloud-laz/indoor.laz';
let information = '-';
let lastDistance = 0;
let tapSeconds = 3;
let tapTimeoutId = 0;
let tapStartSeconds = getCurrentTimeInSeconds();
let device
let isDeviceController = false;
let isDeviceRoleSet = false;

function tapCountdownTick() {
  if(!isDeviceRoleSet) {
    if(tapSeconds > 0) {
      if((getCurrentTimeInSeconds() - tapStartSeconds) > 1) {
        tapSeconds -= 1;
        tapTimeoutId = setTimeout(tapCountdownTick, 1000);
        tapStartSeconds = getCurrentTimeInSeconds();
      }    
    } else {
      if(isDeviceController) {
        console.info("Device is set to be controller.")
        removeElement('.point-cloud-layer')        
      } else {
        console.info("Device is set to be viewer.")
        removeElement('.controller-prompt-window')
      }
      isDeviceRoleSet = true;
    }
  }  
}

function removeElement(selector) {
  var element = document.querySelector(selector)
  if(element) {
    var parent = element.parentNode
    parent.removeChild(element)
  }
}

function getCurrentTimeInSeconds() {
  return Math.floor(new Date().getTime() / 1000);
}

if(USE_LOCAL) {
  DATA_REPO = './';
  FILE_PATH = 'indoor.laz';
}

function normalize(points) {
  let xMin = Infinity;
  let yMin = Infinity;
  let zMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  let zMax = -Infinity;

  for (let i = 0; i < points.length; i++) {
    xMin = Math.min(xMin, points[i].position[0]);
    yMin = Math.min(yMin, points[i].position[1]);
    zMin = Math.min(zMin, points[i].position[2]);
    xMax = Math.max(xMax, points[i].position[0]);
    yMax = Math.max(yMax, points[i].position[1]);
    zMax = Math.max(zMax, points[i].position[2]);
  }

  const scale = Math.max(...[xMax - xMin, yMax - yMin, zMax - zMin]);
  const xMid = (xMin + xMax) / 2;
  const yMid = (yMin + yMax) / 2;
  const zMid = (zMin + zMax) / 2;

  for (let i = 0; i < points.length; i++) {
    points[i].position[0] = (points[i].position[0] - xMid) / scale;
    points[i].position[1] = (points[i].position[1] - yMid) / scale;
    points[i].position[2] = (points[i].position[2] - zMid) / scale;
  }
}

class Example extends PureComponent {

  constructor(props) {
    super(props);

    this._onViewportChange = this._onViewportChange.bind(this);
    this._onInitialized = this._onInitialized.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onUpdate = this._onUpdate.bind(this);

    this.state = {
      width: 0,
      height: 0,
      points: [],
      progress: 0,
      rotating: true,
      viewport: {
        lookAt: [0, 0, 0],
        distance: 0.256,
        rotationX: 0,
        rotationY: 0,
        fov: 30,
        minDistance: 0.001,
        maxDistance: 3
      }
    };
  }

  componentWillMount() {
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  componentDidMount() {
    this._canvas.fitBounds([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);

    const {points} = this.state;

    const skip = 10;
    loadLazFile(`${DATA_REPO}/${FILE_PATH}`).then(rawData => {
      parseLazData(rawData, skip, (decoder, progress) => {
        for (let i = 0; i < decoder.pointsCount; i++) {
          const {color, position} = decoder.getPoint(i);
          points.push({color, position});
        }

        if (progress >= 1) {
          normalize(points);
        }

        this.setState({points, progress});
      });
    });

    window.requestAnimationFrame(this._onUpdate);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize() {
    const {innerWidth: width, innerHeight: height} = window;
    this.setState({width: width / 2, height});
  }

  _onInitialized(gl) {
    setParameters(gl, {
      clearColor: [0.07, 0.14, 0.19, 1],
      depthTest: true,
      depthFunc: gl.LEQUAL
    });
  }

  _onViewportChange(viewport) {
    this.setState({
      rotating: !viewport.isDragging,
      viewport: {...this.state.viewport, ...viewport}
    });
    if(this.state.viewport.distance !== lastDistance) {      
      lastDistance = this.state.viewport.distance;
      console.log(lastDistance)
     }
     let textRotationX = (this.state.viewport.rotationX + "").slice(0,4);
     let textRotationY = (this.state.viewport.rotationY + "").slice(0,4);
     information = textRotationX + " / " + textRotationY;
  }

  _onUpdate() {
    const {rotating, viewport} = this.state;

    // note: when finished dragging, _onUpdate will not resume by default
    // to resume rotating, explicitly call _onUpdate or requestAnimationFrame
    if (!rotating) {
      return;
    }

    this.setState({
      viewport: {
        ...viewport,
        rotationY: viewport.rotationY + 0
      }
    });

    

    window.requestAnimationFrame(this._onUpdate);
  }

  _renderLazPointCloudLayer() {
    const {points} = this.state;
    if (!points || points.length === 0) {
      return null;
    }

    return new PointCloudLayer({
      id: 'laz-point-cloud-layer',
      data: points,
      projectionMode: COORDINATE_SYSTEM.IDENTITY,
      getPosition: d => d.position,
      getNormal: d => [0, 0.5, 0.2],
      getColor: d => [255, 255, 255, 128],
      radiusPixels: 1
    });
  }

  _renderDeckGLCanvas() {
    const {width, height, viewport} = this.state;
    const canvasProps = {width, height, ...viewport};
    const glViewport = OrbitController.getViewport(canvasProps);

    return width && height && (
      <div className="point-cloud-layer">
      <OrbitController {...canvasProps} ref={canvas => {
        this._canvas = canvas;
      }} onViewportChange={this._onViewportChange}>
        <DeckGL
          width={width}
          height={height}
          viewport={glViewport}
          layers={[
            this._renderLazPointCloudLayer()
          ]}
          onWebGLInitialized={this._onInitialized}/>
        <DeckGL
          width={width}
          height={height}
          viewport={glViewport}
          layers={[
            this._renderLazPointCloudLayer()
          ]}
          onWebGLInitialized={this._onInitialized}/>
      </OrbitController>
      </div>
    );
  }

  _renderProgressInfo() {
    const progress = (this.state.progress * 100).toFixed(2);
    return (
      <div>
        <div style={{
          position: 'absolute', left: '8px', bottom: '8px',
          color: '#FFF', fontSize: '8px', backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          {
            this.state.progress < 1 ?
              <div>
                <div>
                  This example might not work on mobile devices due to browser limitations.
                </div>
                <div>
                  Please try checking it with a desktop machine instead.
                </div>
                <div>{`Loading ${progress}% (laslaz loader by plas.io)`}</div>
              </div> :
              <div>{`${information}`}</div>
          }
        </div>
      </div>
    );
  } 

  _promptDeviceRole() {
    tapCountdownTick();
    return (
        <div className='controller-prompt-window' style={{
          position: 'absolute', left: '1vw', bottom: '1vh',
          color: '#FFF', fontSize: '14px', backgroundColor: 'rgba(0,0,0,0.9)',
          width: '99vw', height: '99vh', 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'center', 
          alignItems: 'center',
          cursor: 'pointer'
        }}>
          {
            `Tap in ${tapSeconds} seconds to set this device as controller.`
          }
        </div>
    );
  }

  render() {
    const {width, height} = this.state;
    return width && height && <div>
      <div>
        {this._renderDeckGLCanvas()}
        {this._renderProgressInfo()}
      </div>
        {this._promptDeviceRole()}
    </div>;
  }
}

const root = document.createElement('div');
document.body.appendChild(root);
window.onload = function () {
  console.error("hello");
  var controllerPromptWindow = document.querySelector('.controller-prompt-window')
  controllerPromptWindow.onclick = function () {
    console.info("Device is set to be controller.")
    removeElement('.point-cloud-layer')
    isDeviceController = true;
    isDeviceRoleSet = true;
    tapSeconds = 0;
    controllerPromptWindow.onclick = undefined
  }
}

render(<Example />, root);
