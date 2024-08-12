export enum Event {
  /* Data */
  Metric = 0,
  Dimension = 1,
  Upload = 2,
  Upgrade = 3,
  Baseline = 4,
  Discover = 5,
  Mutation = 6,
  Region = 7,
  Document = 8,
  Click = 9,
  Scroll = 10,
  Resize = 11,
  MouseMove = 12,
  MouseDown = 13,
  MouseUp = 14,
  MouseWheel = 15,
  DoubleClick = 16,
  TouchStart = 17,
  TouchEnd = 18,
  TouchMove = 19,
  TouchCancel = 20,
  Selection = 21,
  Timeline = 22,
  Page = 23,
  Custom = 24,
  Ping = 25,
  Unload = 26,
  Input = 27,
  Visibility = 28,
  Navigation = 29,
  /**
   * @deprecated No longer support Network Connection
   */
  Connection = 30,
  ScriptError = 31,
  /**
   * @deprecated No longer support Image Error
   */
  ImageError = 32,
  Log = 33,
  Variable = 34,
  Limit = 35,
  Summary = 36,
  /**
   * @deprecated No longer support Box event
   */
  Box = 37,
  Clipboard = 38,
  Submit = 39,
  Extract = 40,
  Fraud = 41,
  Change = 42,
  Snapshot = 43,
  Animation = 44,
  StyleSheetAdoption = 45,
  StyleSheetUpdate = 46,
}
