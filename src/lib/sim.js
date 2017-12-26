import fs from 'fs-extra'
import IOSSimulator from 'ios-simulator'

import {
  success,
  error,
} from './logger'
import {
  choose,
} from './util'

const CHECK_MAX_COUNT = 20

/**
 * create
 * 1. choose run time
 * 2. choose deviceType
 * 3. create simulator
 * 4. invoke callback
 *
 * @name create
 * @function
 * @access public
 */
async function create (cb) {
  let myDeviceName
  let myRunTime
  let myDeviceType
  let myDid

  try {
    myRunTime = await chooseRunTime()
    myDeviceType = await chooseDeviceType()
    myDeviceName = `apfe-sim-${myDeviceType.name}-${myRunTime.name}`
    myDid = IOSSimulator.create(myDeviceName, myDeviceType.value, myRunTime.value)
    success(`simulator created successfully! name: ${myDeviceName}, did: ${myDid}`)
    cb && cb()
  } catch (e) {
    error(`simulator created failed, error: ${e.message}`)
  }
}

/**
 * remove
 * delect selected simulator
 *
 * @name remove
 * @function
 * @access public
 */
function remove () {
  const devices = findDevices()
  if (devices.length === 0) {
    success('all apfe simulator has been removed')
    return
  }

  choose({
    type: 'list',
    name: 'device',
    message: 'Please select the simulator to remove',
    choices: [{ name: 'all' }].concat(devices),
    default: devices[0],
  }).then(res => {
    if (res.device === 'all') {
      return devices.forEach(_ => removeDevice(_.did))
    }
    const device = devices.find(d => d.name === res.device)
    removeDevice(device.did)
  })
}

/**
 * start
 * select the device to boot
 *
 * @name start
 * @function
 * @access public
 */
function start (cb) {
  const devices = findDevices()

  const bootedDevice = devices.find(_ => _.status === 'Booted')
  // already booted
  if (bootedDevice) {
    success(`simulator already booted, did ${bootedDevice.did}`)
    cb && cb()
    return
  }

  // not install
  if (devices.length === 0) {
    create(start.bind(null, cb))
    return
  }

  // only one device, start directly
  if (devices.length === 1) {
    launch(devices[0].did, cb)
    return
  }

  // mutil devices, select one to boot
  choose({
    type: 'list',
    name: 'device',
    message: 'Please select the simulator to boot',
    choices: devices,
    default: devices[0],
  }).then(res => {
    const device = devices.find(d => d.name === res.device)
    launch(device.did, cb)
  })
}


/**
 * install
 * 1. check appPath
 * 2. check booted simulator
 *
 * @name install
 * @function
 * @access public
 */
function install (appPath) {
  if (!fs.pathExistsSync(appPath)) {
    error(`invalid app path: ${appPath}`)
    return
  }

  start(_ => {
    try {
      IOSSimulator.singleton.install(appPath)
      success(`install ${appPath} success`)
    } catch (e) {
      error(`install ${appPath} failed`)
    }
  })
}

/**
 * chooseRunTime
 * choose device run time
 *
 * @name chooseRunTime
 * @function
 * @access public
 * @returns {Promise} runTime answer
 */
function chooseRunTime () {
  const runTimes = IOSSimulator.getAvaliableRuntimes()

  if (!runTimes) {
    error('xcrun simctl error, please run Xcode.app first.')
  }

  return choose({
    type: 'list',
    name: 'runTime',
    message: 'Please select the simulator runtime',
    choices: runTimes,
    default: runTimes[0],
  }).then(res => {
    return runTimes.find(r => r.value === res.runTime)
  })
}

/**
 * chooseDeviceType
 * choose device type
 *
 * @name chooseDeviceType
 * @function
 * @access public
 * @returns {Promise} runTime answer
 */
function chooseDeviceType () {
  const deviceTypes = getDeviceTypes()
  return choose({
    type: 'list',
    name: 'deviceType',
    message: 'Please select device type',
    choices: deviceTypes,
    default: deviceTypes[0],
  }).then(res => {
    return deviceTypes.find(r => r.value === res.deviceType)
  })
}

/**
 * getDeviceTypes
 * get all device types by invoke xcrun
 *
 * @name getDeviceTypes
 * @function
 * @access public
 * @returns {Array} device types
 */
function getDeviceTypes () {
  const stdout = IOSSimulator.getDeviceTypes()
  const matchPattern = /^(i[a-zA-Z0-9. \-()]+)\((com\.apple\.CoreSimulator\.SimDeviceType\.([a-zA-Z0-9.-]+))/i
  const deviceTypesArr = []
  const fixedDeviceName = ['iPhone2017-A', 'iPhone2017-B', 'iPhone2017-C']

  if (stdout) {
    stdout.split('\n').forEach((item) => {
      item = item.trim()
      const match = item.match(matchPattern)
      if (match && !/unavailable/i.test(item)) {
        const deviceDesc = match[1].trim()
        const name =
          fixedDeviceName.indexOf(deviceDesc) > -1
            ? match[3].trim()
            : deviceDesc
        deviceTypesArr.push({
          name: name.replace(/-/g, ' '),
          value: match[2].trim(),
        })
      }
    })
  }

  return deviceTypesArr
}

/**
 * findDevices
 *
 * @name findDevices
 * @function
 * @access public
 * @returns {Array} devices
 */
function findDevices () {
  const stdout = IOSSimulator.getDevicesSync()
  const rex = new RegExp('(apfe-sim[-a-zA-Z0-9]* .*?).*((.*?)) ((.*?))$', 'igm')

  // ignore unavailable
  let usefulListStr = ''
  stdout.split('-- ').map((item) => {
    if (item.indexOf('Unavailable') < 0) {
      usefulListStr += item
    }
  })

  const match = usefulListStr.match(rex)
  if (match) {
    const devices = []
    match.forEach((device) => {
      const info = device.match(/.*(apfe-sim.*?) \((.*?)\) \((.*?)\)/i)
      const name = info[1]
      const did = info[2]
      const status = info[3]

      devices.push({name: name, did: did, status: status})
    })
    return devices
  } else {
    return []
  }
}

/**
 * launch
 * open simulator
 *
 * @name start
 * @function
 * @access public
 * @param {String} did devices id
 */
function launch (did, cb) {
  success(`starting simulator, did: ${did}`)

  try {
    IOSSimulator.launchByUDID(did)
    bootChecker(did, cb)
  } catch (e) {
    error('boot device failed')
  }
}

/**
 * bootChecker
 *
 * @name bootChecker
 * @function
 * @access public
 * @param {String} did device id
 * @param {Function} cb callback
 * @param {Number} current current check number
 */
function bootChecker (did, cb, current) {
  current = current || 0
  if (current > CHECK_MAX_COUNT) {
    error(`booted failed did: ${did}`)
    process.exit(1)
  }
  const devices = findDevices()
  const booted = devices.find(_ => {
    return _.did === did && _.status === 'Booted'
  })

  if (booted) {
    cb && cb()
  } else {
    setTimeout(bootChecker.bind(null, did, cb, current++), 1000)
  }
}

/**
 * removeChecker
 *
 * @name removeChecker
 * @function
 * @access public
 * @param {String} did device id
 * @param {Function} cb callback
 * @param {Number} current current check number
 */
function removeChecker (did, cb, current) {
  current = current || 0
  if (current > CHECK_MAX_COUNT) {
    error(`remove failed did: ${did}`)
  }
  const devices = findDevices()
  const device = devices.find(_ => _.did === did)

  if (!device) {
    cb && cb()
  } else {
    setTimeout(removeChecker.bind(null, did, cb, current++), 1000)
  }
}

/**
 * shutDownChecker
 *
 * @name shutDownChecker
 * @function
 * @access public
 * @param {String} did device id
 * @param {Function} cb callback
 * @param {Number} current current check number
 */
function shutDownChecker (did, cb, current) {
  current = current || 0
  if (current > CHECK_MAX_COUNT) {
    error(`shutdown simulator failed did: ${did}`)
  }
  const devices = findDevices()
  const device = devices.find(_ => _.did === did && _.status === 'Shutdown')

  if (device) {
    cb && cb()
  } else {
    setTimeout(shutDownChecker.bind(null, did, cb, current++), 1000)
  }
}

/**
 * removeDevice
 * remvoe device
 *
 * @name removeDevice
 * @function
 * @access public
 * @param {String} did device id
 */
function removeDevice (did) {
  try {
    shutDownChecker(did, _ => {
      const simulator = new IOSSimulator({
        deviceId: did,
      })
      simulator.remove()
      removeChecker(did, _ => {
        success(`remove simulator success, did: ${did}`)
      })
    })
  } catch (e) {
    error('remove device failed')
  }
}

/**
 * openUrl
 *
 * @name openUrl
 * @function
 * @access public
 * @param {String} url openWebUrl
 */
function openUrl (url) {
  const schema = 'alipayplus://alipay.com/webpage/'
  const schemaUrl = `${schema}${encodeURIComponent(url)}`
  try {
    IOSSimulator.singleton.openURL(schemaUrl)
    success('openurl success')
  } catch (e) {
    error('openurl failed, have you install the app ?')
  }
}

export {
  create,
  start,
  install,
  remove,
  openUrl,
}
