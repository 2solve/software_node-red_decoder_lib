const test = require("node:test");
const assert = require("node:assert");
const { EventEmitter } = require("node:events");

// Minimal fake of the Node-RED runtime: just what 2stools.js calls (createNode, registerType).
function fakeRED() {
  const types = {};
  return {
    types,
    nodes: {
      createNode(node) {
        EventEmitter.call(node);
        Object.assign(node, EventEmitter.prototype);
        node.sent = [];
        node.send = (msg) => node.sent.push(msg);
      },
      registerType(name, ctor) {
        types[name] = ctor;
      },
    },
  };
}

function f32(v) {
  const x = Buffer.alloc(4);
  x.writeFloatBE(v);
  return x.toString("hex");
}

test("registers 2stools-datacodec and decodes a ChirpStack uplink", () => {
  const RED = fakeRED();
  require("../2stools.js")(RED);
  assert.deepStrictEqual(Object.keys(RED.types), ["2stools-datacodec"]);

  const node = {};
  RED.types["2stools-datacodec"].call(node, {});

  // BatteryMon (id 3, float) = 3.6 and BatteryLevel (id 191, 1 byte) = 87, fPort 2.
  const hex = "0003" + f32(3.6) + "00bf" + "57";
  const uplink = { fPort: 2, data: Buffer.from(hex, "hex").toString("base64") };
  node.emit("input", { payload: Buffer.from(JSON.stringify(uplink)) });

  assert.strictEqual(node.sent.length, 1);
  assert.deepStrictEqual(node.sent[0].payload.json2sense, { BatteryMon: "3.6000", BatteryLevel: "87" });
});
