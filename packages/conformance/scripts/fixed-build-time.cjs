// Makes Saxon-JS SEF compilation byte-deterministic by fixing compiler metadata.
const NativeDate = Date;
const fixedTime = NativeDate.parse("2000-01-01T00:00:00.000Z");

global.Date = class FixedDate extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : [fixedTime]));
  }

  static now() {
    return fixedTime;
  }
};
