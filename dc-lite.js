// dc-lite: 디자인 캔버스(.dc.html) 템플릿을 일반 웹페이지에서 그리는 작은 런타임.
// 지원 범위: {{경로}} 치환, <sc-for list as>, <sc-if value>, onClick 등 이벤트, setState 다시 그리기.
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var inst, tpl, root;

  function look(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = look(p, scope); return v == null ? '' : String(v); });
  }

  function hole(node, name, scope) {
    var m = WHOLE.exec(node.getAttribute(name) || '');
    return m ? look(m[1], scope) : undefined;
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = hole(node, 'list', scope) || [];
      var as = node.getAttribute('as') || 'item';
      list.forEach(function (it, i) {
        var s = Object.create(scope); s[as] = it; s.$index = i;
        node.childNodes.forEach(function (c) { build(c, s, out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      if (hole(node, 'value', scope)) node.childNodes.forEach(function (c) { build(c, scope, out); });
      return;
    }
    var el = node.namespaceURI === 'http://www.w3.org/1999/xhtml'
      ? document.createElement(tag)
      : document.createElementNS(node.namespaceURI, node.localName);
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name, v = a.value;
      if (n.indexOf('hint-') === 0) return;
      var m = WHOLE.exec(v);
      if (n.indexOf('on') === 0 && m) {
        var fn = look(m[1], scope);
        if (typeof fn === 'function') el.addEventListener(n.slice(2), fn);
        return;
      }
      if (m) {
        var val = look(m[1], scope);
        if (val === false || val == null) return;
        el.setAttribute(n, val === true ? '' : String(val));
        return;
      }
      el.setAttribute(n, interp(v, scope));
    });
    var kids = [];
    node.childNodes.forEach(function (c) { build(c, scope, kids); });
    kids.forEach(function (k) { el.appendChild(k); });
    out.push(el);
  }

  function render() {
    var y = window.scrollY;
    var out = [];
    var vals = inst.renderVals();
    tpl.content.childNodes.forEach(function (c) { build(c, vals, out); });
    root.replaceChildren.apply(root, out);
    window.scrollTo(0, y);
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    var next = typeof p === 'function' ? p(this.state) : p;
    this.state = Object.assign({}, this.state, next);
    render();
  };
  DCLogic.prototype.forceUpdate = function () { render(); };
  window.DCLogic = DCLogic;

  function jumpToHash() {
    if (!location.hash) return;
    var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }

  document.addEventListener('DOMContentLoaded', function () {
    tpl = document.getElementById('dc-template');
    root = document.getElementById('app');
    /* global Component */
    inst = new Component({});
    render();
    jumpToHash();
    window.addEventListener('load', jumpToHash);
  });
})();
