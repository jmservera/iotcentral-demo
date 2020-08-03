"use strict";

// Use the Azure IoT device SDK for devices that connect to Azure IoT Central.
const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// get info from .env file
const dotenv = require('dotenv');
dotenv.config();


var provisioningHost = process.env.HOST;
var idScope = process.env.SCOPE;
var registrationId = process.env.ID;
var symmetricKey = process.env.KEY;

var provisioningSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);
var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), provisioningSecurityClient);
var hubClient;



var targetSpeed = 1;
var range=5.0;
var randomWeight=0.25;
var clycleOn = true;


// Send device measurements.
function sendTelemetry() {
    if(clycleOn===true){
        var current = Math.sin(new Date().getTime()*targetSpeed/5000)*range + (Math.random() * randomWeight);
        var data = JSON.stringify({
            Cycle: current
        });
        var message = new Message(data);
        hubClient.sendEvent(message, (err, res) => console.log(`Sent message: ${message.getData()}` +
        (err ? `; error: ${err.toString()}` : '') +
        (res ? `; status: ${res.constructor.name}` : '')));
    }
  }

  // Send device reported properties.
function sendDeviceProperties(twin, properties) {
    twin.properties.reported.update(properties, (err) => console.log(`Sent device properties: ${JSON.stringify(properties)}; ` +
      (err ? `error: ${err.toString()}` : `status: success`)));
  }

// Add any writeable properties your device supports,
// mapped to a function that is called when the setting is changed.
var settings = {
    'Speed': (newValue, callback) => {
        targetSpeed=parseFloat(newValue);
        callback(newValue, 'completed');
    },
    'MaxRange':(newValue, callback) => {
        range=parseFloat(newValue);
        callback(newValue, 'completed');
    }
  };
  
  // Handle writeable property changes that come from Azure IoT Central via the device twin.
  function handleSettings(twin) {
    twin.on('properties.desired', function (desiredChange) {
      for (let setting in desiredChange) {
        console.log(`Received setting: ${setting}: ${desiredChange[setting].value}`);
        if (settings[setting]) {
            console.log(`Writing settting. Old value: ${settings[setting]} New value:${desiredChange[setting].value}`);

            settings[setting](desiredChange[setting].value, (newValue, status, message) => {
                var patch = {
                [setting]: {
                    value: newValue,
                    status: status,
                    desiredVersion: desiredChange.$version,
                    message: message
                }
                }
            sendDeviceProperties(twin, patch);
          });
        }
      }
    });
  }

  // Handle Cycle turn on command
  function turnCycleOn(request, response) {
    console.log(`Received synchronous call to turn on Cycle with ${request.payload} range`);
    randomWeight=request.payload;
    hubClient.getTwin((err, twin) => {
      if (err) {
        console.log(`Error getting device twin: ${err.toString()}`);
      } else {
        // Send Environmental Sensor device properties once on device start up.
        var properties = {
          RandomWeight: randomWeight
        };
        sendDeviceProperties(twin, properties);
      }
    });

    if(!clycleOn){
      console.log('Turning on the Cycle');
      clycleOn = true;
    }
    response.send(200, (err) => {
      if (err) {
        console.error('Unable to send method response: ' + err.toString());
      }
    });
  }
  
  function turnCycleOff(request, response) {
    console.log('Received synchronous call to turn off Cycle');
    if(clycleOn){
      console.log('Turning off the Cycle');
      clycleOn = false;
    }
    response.send(200, (err) => {
      if (err) {
        console.error('Unable to send method response: ' + err.toString());
      }
    });
  }
  
// Handle device connection to Azure IoT Central.
var connectCallback = (err) => {
    if (err) {
      console.log(`Device could not connect to Azure IoT Central: ${err.toString()}`);
    } else {
      console.log('Device successfully connected to Azure IoT Central');

      // Get device twin from Azure IoT Central.
      hubClient.getTwin((err, twin) => {
        if (err) {
          console.log(`Error getting device twin: ${err.toString()}`);
        } else {
          // Send Environmental Sensor device properties once on device start up.
          var properties = {
            Speed: targetSpeed,
            MaxRange: range,
            RandomWeight:randomWeight
          };
          sendDeviceProperties(twin, properties);
          handleSettings(twin);
        }
      });
    }
  };
  
  // Start the device (register and connect to Azure IoT Central).
  provisioningClient.register((err, result) => {
    if (err) {
      console.log('Error registering device: ' + err);
    } else {
      console.log('Registration succeeded');
      console.log('Assigned hub=' + result.assignedHub);
      console.log('DeviceId=' + result.deviceId);
      var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
      hubClient = Client.fromConnectionString(connectionString, iotHubTransport);
      hubClient.open(connectCallback);
    }
  });