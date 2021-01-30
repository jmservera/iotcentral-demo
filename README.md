# Azure IoT Central Demo

A simple nodejs device that simulates a sinusoidal curve with some randomization as a device for IoT Central.

## Steps to deploy it

1. Create a [IoT Central app](https://aka.ms/IoTCentral)
2. Create a new Device Template and import the one you find in the [device template](node_device/device%20template) folder
3. Create a new device from the template
4. Get the connection values from the device in IoT Central
5. Create a .env file with the needed values like in [example-env](node_device/example-env)
6. Run the node application (you may need to do a npm install / yarn install before)
7. Now you can start creating device views in the device template and see the data
  
