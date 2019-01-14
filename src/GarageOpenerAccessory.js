const ComboAccessory = require('./ComboAccessory.js');
const Timer = require('timercore');

class GarageOpenerAccessory extends ComboAccessory {
  constructor(log, url, accessToken, device, homebridge) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    super(log, url, accessToken, device, homebridge, Service.GarageDoorOpener, Characteristic.TargetDoorState);

  }
}

module.exports = GarageOpenerAccessory;
