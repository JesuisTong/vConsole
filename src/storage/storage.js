/*
Tencent is pleased to support the open source community by making vConsole available.

Copyright (C) 2017 THL A29 Limited, a Tencent company. All rights reserved.

Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * vConsole Storage Plugin
 */

import VConsolePlugin from '../lib/plugin.js';
import tplTabbox from './tabbox.html';
import tplList from './list.html';

import * as tool from '../lib/tool.js';
import $ from '../lib/query.js';

class VConsoleStorageTab extends VConsolePlugin {

  constructor(...args) {
    super(...args);

    this.$tabbox = $.render(tplTabbox, {});
    this.currentType = ''; // cookies, localstorage, ...
    this.typeNameMap = {
      'cookies': 'Cookies',
      'localstorage': 'LocalStorage',
      'sessionstorage': 'SessionStorage'
    }
  }

  onRenderTab(callback) {
    callback(this.$tabbox);
  }

  onAddTopBar(callback) {
    let that = this;
    let types = ['Cookies', 'LocalStorage', 'SessionStorage'];
    let btnList = [];
    for (let i = 0; i < types.length; i++) {
      btnList.push({
        name: types[i],
        data: {
          type: types[i].toLowerCase()
        },
        className: '',
        onClick: function() {
          if (!$.hasClass(this, 'vc-actived')) {
            that.currentType = this.dataset.type;
            that.renderStorage();
          } else {
            return false;
          }
        }
      });
    }
    btnList[0].className = 'vc-actived';
    callback(btnList);
  }

  onAddTool(callback) {
    let that = this;
    let toolList = [{
      name: 'Refresh',
      global: false,
      onClick: function(e) {
        that.renderStorage();
      }
    }, {
      name: 'Clear',
      global: false,
      onClick: function(e) {
        that.clearLog();
      }
    }];
    callback(toolList);
  }

  onReady() {
    // do nothing
  }

  onShow() {
    // show default panel
    if (this.currentType == '') {
      this.currentType = 'cookies';
      this.renderStorage();
      this.addListennerClick();
    }
  }

  clearLog() {
    if (this.currentType && window.confirm) {
      let result = window.confirm('Remove all ' + this.typeNameMap[this.currentType] + '?');
      if (!result) {
        return false;
      }
    }
    switch (this.currentType) {
      case 'cookies':
        this.clearCookieList();
        break;
      case 'localstorage':
        this.clearLocalStorageList();
        break;
      case 'sessionstorage':
        this.clearSessionStorageList();
        break;
      default:
        return false;
    }
    this.renderStorage();
  }

  renderStorage() {
    let list = [];

    switch (this.currentType) {
      case 'cookies':
        list = this.getCookieList();
        break;
      case 'localstorage':
        list = this.getLocalStorageList();
        break;
      case 'sessionstorage':
        list = this.getSessionStorageList();
        break;
      default:
        return false;
    }

    let $log = $.one('.vc-log', this.$tabbox);
    if (list.length == 0) {
      $log.innerHTML = '';
    } else {
      // html encode for rendering
      for (let i=0; i<list.length; i++) {
        list[i].name = tool.htmlEncode(list[i].name);
        list[i].value = tool.htmlEncode(list[i].value);
      }
      $log.innerHTML = $.render(tplList, {list: list, currentType: this.currentType}, true);
    }

  }

  addListennerClick() {
    let that = this;
    $.delegate($.one('.vc-log', this.$tabbox), 'click', '.vc-table-col-button', function(e) {
      console.log(this, e);
      let name = this.dataset.name;
      let value = this.dataset.value || '';

      if ($.hasClass(this, 'delete')) { // 删除
        that.delete(name, that.currentType);
      } else if ($.hasClass(this, 'change')) {
        that.set({
          name: name,
          value: value,
        }, that.currentType);
      }
      e.preventDefault();

      that.renderStorage();
    });
  }

  getCookieList() {
    if (!document.cookie || !navigator.cookieEnabled) {
      return [];
    }

    let list = [];
    let items = document.cookie.split(';');
    for (let i=0; i<items.length; i++) {
      let item = items[i].split('=');
      let name = item.shift().replace(/^ /, ''),
          value = item.join('=');
      try {
        name = decodeURIComponent(name);
        value = decodeURIComponent(value);
      } catch(e) {
        console.log(e, name, value);
      }
      list.push({
        name: name,
        value: value
      });
    }
    return list;
  }

  getLocalStorageList() {
    if (!window.localStorage) {
      return [];
    }

    try {
      let list = []
      for (var i = 0; i < localStorage.length; i++) {
        let name = localStorage.key(i),
            value = localStorage.getItem(name);
        list.push({
          name: name,
          value: value
        });
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  getSessionStorageList() {
    if (!window.sessionStorage) {
      return [];
    }

    try {
      let list = []
      for (var i = 0; i < sessionStorage.length; i++) {
        let name = sessionStorage.key(i),
            value = sessionStorage.getItem(name);
        list.push({
          name: name,
          value: value
        });
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  clearCookieList() {
    if (!document.cookie || !navigator.cookieEnabled) {
      return;
    }

    let list = this.getCookieList();
    for (var i=0; i<list.length; i++) {
      document.cookie = list[i].name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    this.renderStorage();
  }

  clearLocalStorageList() {
    if (!!window.localStorage) {
      try {
        localStorage.clear();
        this.renderStorage();
      } catch (e) {
        alert('localStorage.clear() fail.');
      }
    }
  }

  clearSessionStorageList() {
    if (!!window.sessionStorage) {
      try {
        sessionStorage.clear();
        this.renderStorage();
      } catch (e) {
        alert('sessionStorage.clear() fail.');
      }
    }
  }

  delete(name, currentType) {
    switch (currentType) {
      case 'cookies':
        this.deleteCookie(name);
        break;
      case 'localstorage':
        this.deleteLocalstorage(name);
        break;
      case 'sessionstorage':
        this.deleteSessionstorage(name);
        break;
      default:
        break;
    }

    this.renderStorage();
  }

  deleteCookie(name) {
    this.setCookie(name, '', -1);
  }

  deleteLocalstorage(name) {
    localStorage.removeItem(name);
  }

  deleteSessionstorage(name) {
    sessionStorage.removeItem(name);
  }

  set(option, currentType) {
    let name = option.name || '';
    let value = option.value || '';
    switch (currentType) {
      case 'cookies':
        this.setCookie(name, value);
        break;
      case 'localstorage':
        this.setLocalstorage(name, value);
        break;
      case 'sessionstorage':
        this.setSessionstorage(name, value);
        break;
      default:
        break;
    }

    this.renderStorage();
  }

  setCookie(name, value, expiredays = 1) { // 默认设置一天的cookie
    if (expiredays === -1) {
      document.cookie = `${name}=;domain=.weipaitang.com;expires=${new Date(Date.now() - 86400000).toGMTString()};path=/`;
    } else {
      let exdate = {};
      let prompt = window.prompt('cookie: ' + name, value);
      if (typeof expiredays === 'number') {
          exdate = new Date();
          exdate.setDate(exdate.getDate() + expiredays);
      } else if (typeof expiredays === 'object') {
          exdate = expiredays;
      }
      const expireStr = !expiredays ? ';domain=.weipaitang.com' : `;domain=.weipaitang.com;expires=${exdate.toGMTString()}`;
      if (prompt) { // 如果有设置值
        document.cookie = `${name}=${encodeURIComponent(prompt)}${expireStr};path=/`;
      }
    }
  }

  setLocalstorage(name, value) {
    let prompt = window.prompt('localStorage: ' + name, value);

    if (prompt) {
      window.localStorage.setItem(name, prompt);
    }
  }

  setSessionstorage(name, value) {
    let prompt = window.prompt('sessionStorage: ' + name, value);

    if (prompt) {
      window.localStorage.setItem(name, prompt);
    }
  }
} // END Class

export default VConsoleStorageTab;