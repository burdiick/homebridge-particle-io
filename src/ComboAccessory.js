const request = require('request');
const Accessory = require('./Accessory.js');
const EventSource = require('eventsource');


class ComboAccessory extends Accessory {


  constructor(log, url, accessToken, device, homebridge, ServiceType, CharacteristicType) {
    super(log, url, accessToken, device, homebridge, ServiceType, CharacteristicType);

    this.function_name = !device.function_name ? 'power' : device.function_name;
    this.comboService = new ServiceType(this.name);
    const Characteristic = homebridge.hap.Characteristic;

    this.eventName = device.event_name;
    this.key = device.key;
    this.unit = null;
    this.split_character = !device.split_character ? '=' : device.split_character;

    this.eventUrl = `${this.url}${this.deviceId}/events/${this.eventName}?access_token=${this.accessToken}`;
    this.log('Listening for events from:', this.eventUrl);

    const events = new EventSource(this.eventUrl);

    this.log("Adding Event Listener");
    events.addEventListener(this.eventName, this.processEventData.bind(this));
    events.onerror = this.processEventError.bind(this);

    this.log("Adding this service to ");
    this.services.push(this.comboService);
    this.service = this.services[1];

    this.setupGarageDoorOpenerService(this.comboService);
  }

  callParticleFunction(functionName, arg, callback, outputRAW) {
    const url = `${this.url}${this.deviceId}/${functionName}`;
    this.log('Calling function: "', url, '" with arg: ', arg);
    const form = {
      access_token: this.accessToken,
      arg
    };
    if (outputRAW) {
      form.format = 'raw';
    }
    request.post(
      url,
      {
        form
      },
      callback
    );
  }

  getState(callback) {
    this.callParticleFunction(this.function_name, '?', (error, response, body) => {
      this.value = parseInt(body, 10);
      try {
        callback(null, this.value);
      } catch (err) {
        this.log(`Caught error ${err} when calling homebridge callback.`);
      }
    },
    true);
  }

  setState(value, callback) {


  }

  callbackHelper(error, response, body, callback) {
    if (!error) {
      callback();
    } else {
      this.log(error);
      this.log(response);
      this.log(body);
      callback(error);
    }
  }

  processEventError(error) {
    this.log('ERROR!', error);
  }

  processEventData(e) {
    const data = JSON.parse(e.data);
    const result = this.key ? data.data.split(this.split_character)[1] : data.data;

    this.log("Are we processing event data for this?");
    const splits = result.split(",");
    if (this.services.length < 2) {
      return;
    }

    // let Characteristic = homebridge.hap.Characteristic;
    //
    // let currentstate = splits[0].split("=");
    // this.log("CurrentState: ", currentstate);
    // switch (currentstate[1]) {
    //   case "0":
    //   this.log("setting state to Open");
    //     this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
    //   case "1":
    //     this.service.setCharacteristic(Characteristic.CurrentDoorState,
    //     Characteristic.CurrentDoorState.CLOSED);
    //   case "2":
    //     this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    //   case "3":
    //     this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
    //   case "4":
    //     this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.STOPPED);
    //   default:
    // }
    //
    // let targetstate = splits[1].split('=');
    // this.log("TargetState: ", targetstate);
    // if (targetstate[1] === "0" && targetstate[1] != Characteristic.TargetDoorState.OPEN) {
    //   this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN);
    // } else if (targetstate[1] === "1" && targetstate[1] != Characteristic.TargetDoorState.CLOSED) {
    //   this.service.getCharacteristic(Characteristic.TargetDoorState).setValue(Characteristic.TargetDoorState.CLOSED);
    //   this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    // }
  }

  setupGarageDoorOpenerService (service) {
    let Characteristic = homebridge.hap.Characteristic;
    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var tds = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (tds === Characteristic.TargetDoorState.OPEN) {
          this.log('Setting TargetDoorState to CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, Characteristic.TargetDoorState.OPEN);
        }
      })
      .on('set', (value, callback) => {
        if (value === Characteristic.TargetDoorState.OPEN) {
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
              this.log(this.function_name, ", ", value);
              this.value = this.args.replace("{STATE}", value)
              this.callParticleFunction(this.function_name,
                                        this.value, (error, response, body) => this.callbackHelper(error, response, body, callback), true);
              this.simulateDoorOpening();
              break;
            case Characteristic.CurrentDoorState.CLOSING:
              break;
            case Characteristic.CurrentDoorState.OPEN:

              break;
            default:
              callback();
          }
        } else {
          callback();
        }
      });
  }

  simulateDoorClosing() {
    const Characteristic = homebridge.hap.Characteristic;
    this.service.setCharacteristic(Characteristic.CurrentDoorState,
    Characteristic.CurrentDoorState.CLOSING);
    setTimeout(() => {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.Closed);
    }, 15000);
  }

  simulateDoorOpening () {
    const Characteristic = homebridge.hap.Characteristic;
    this.log("is this thing getting called?");
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    setTimeout(() => {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
      setTimeout(() => {
        this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
        this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        setTimeout(() => {
          this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
        }, 15 * 1000);
      }, 30 * 1000);
    }, 15 * 1000);
  }
}

module.exports = ComboAccessory;
