export const GATE_LABEL = ['壹', '貳', '參'];

export function sideName(side, names) {
  if (names?.[side]) return names[side];
  return side === 'X' ? '金叉' : '玉環';
}

export function resultCopy(view, names) {
  const xName = sideName('X', names);
  const oName = sideName('O', names);
  if (view.phase === 'match_end') {
    if (view.matchWinner === 'draw') {
      return { seal: '平', text: '三關打成平手', action: '再戰三關' };
    }
    const winner = view.matchWinner === 'X' ? xName : oName;
    return { seal: '過關', text: `${winner}過了三關`, action: '再戰三關' };
  }
  if (view.phase === 'gate_end') {
    if (view.outcome?.draw) {
      return { seal: '和', text: '這一關握手言和', action: '進入下一關' };
    }
    const winner = view.outcome?.player === 'X' ? xName : oName;
    return { seal: '勝', text: `${winner}勝了這一關`, action: '進入下一關' };
  }
  return null;
}

export function turnLine(view, names, { thinking, waiting, you } = {}) {
  if (waiting) return '等待對手入座';
  if (!view) return '拖曳可旋轉棋盤';
  if (view.phase === 'match_end') return resultCopy(view, names)?.text || '';
  if (view.phase === 'gate_end') return resultCopy(view, names)?.text || '';
  const name = sideName(view.turn, names);
  if (thinking) return `${name}思索中`;
  if (you && view.turn === you) return `輪到你 · ${name}`;
  if (you && view.turn !== you) return `等待${name}落子`;
  return `輪到${name}`;
}
