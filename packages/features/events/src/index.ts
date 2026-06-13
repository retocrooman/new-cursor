// Public API surface for @new-cursor/events-feature.
//
// 履歴表示用の横断 feature。書き込みは行わず、events テーブルからの読み出しと
// aggregate type 列挙のみを提供する。内部の repository / model ファイルを
// apps から直接 import しないこと。

export * from "./model/index";
export * from "./repository/index";
