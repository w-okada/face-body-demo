/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./node_modules/ts-loader/index.js!./src/workerAA.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/ts-loader/index.js!./src/workerAA.ts":
/*!**************************************************!*\
  !*** ./node_modules/ts-loader!./src/workerAA.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try {\n            step(generator.next(value));\n        }\n        catch (e) {\n            reject(e);\n        } }\n        function rejected(value) { try {\n            step(generator[\"throw\"](value));\n        }\n        catch (e) {\n            reject(e);\n        } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nvar __generator = (this && this.__generator) || function (thisArg, body) {\n    var _ = { label: 0, sent: function () { if (t[0] & 1)\n            throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;\n    return g = { next: verb(0), \"throw\": verb(1), \"return\": verb(2) }, typeof Symbol === \"function\" && (g[Symbol.iterator] = function () { return this; }), g;\n    function verb(n) { return function (v) { return step([n, v]); }; }\n    function step(op) {\n        if (f)\n            throw new TypeError(\"Generator is already executing.\");\n        while (_)\n            try {\n                if (f = 1, y && (t = op[0] & 2 ? y[\"return\"] : op[0] ? y[\"throw\"] || ((t = y[\"return\"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)\n                    return t;\n                if (y = 0, t)\n                    op = [op[0] & 2, t.value];\n                switch (op[0]) {\n                    case 0:\n                    case 1:\n                        t = op;\n                        break;\n                    case 4:\n                        _.label++;\n                        return { value: op[1], done: false };\n                    case 5:\n                        _.label++;\n                        y = op[1];\n                        op = [0];\n                        continue;\n                    case 7:\n                        op = _.ops.pop();\n                        _.trys.pop();\n                        continue;\n                    default:\n                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {\n                            _ = 0;\n                            continue;\n                        }\n                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {\n                            _.label = op[1];\n                            break;\n                        }\n                        if (op[0] === 6 && _.label < t[1]) {\n                            _.label = t[1];\n                            t = op;\n                            break;\n                        }\n                        if (t && _.label < t[2]) {\n                            _.label = t[2];\n                            _.ops.push(op);\n                            break;\n                        }\n                        if (t[2])\n                            _.ops.pop();\n                        _.trys.pop();\n                        continue;\n                }\n                op = body.call(thisArg, _);\n            }\n            catch (e) {\n                op = [6, e];\n                y = 0;\n            }\n            finally {\n                f = t = 0;\n            }\n        if (op[0] & 5)\n            throw op[1];\n        return { value: op[0] ? op[1] : void 0, done: true };\n    }\n};\nObject.defineProperty(exports, \"__esModule\", { value: true });\nvar const_1 = __webpack_require__(/*! ./const */ \"./src/const.ts\");\nvar ctx = self; // eslint-disable-line no-restricted-globals\nvar _asciiStr = \" .,:;i1tfLCG08@\";\nvar _asciiCharacters = (_asciiStr).split(\"\");\nvar _fontSize = 6;\nvar contrastFactor = (259 * (128 + 255)) / (255 * (259 - 128));\nvar convert = function (image) {\n    return __awaiter(void 0, void 0, void 0, function () {\n        var offscreen, ctx, m, charWidth, tmpWidth, tmpHeight, offscreenForBrightness, brCtx, brImageData, lines, y, line, x, offset, r, g, b, brightness, character, n;\n        return __generator(this, function (_a) {\n            offscreen = new OffscreenCanvas(image.width, image.height);\n            ctx = offscreen.getContext(\"2d\");\n            ctx.font = _fontSize + \"px monospace\";\n            ctx.textBaseline = \"top\";\n            m = ctx.measureText(_asciiStr);\n            charWidth = Math.floor(m.width / _asciiCharacters.length);\n            tmpWidth = Math.ceil(image.width / charWidth);\n            tmpHeight = Math.ceil(image.height / _fontSize);\n            offscreenForBrightness = new OffscreenCanvas(tmpWidth, tmpHeight);\n            brCtx = offscreenForBrightness.getContext(\"2d\");\n            brCtx.drawImage(image, 0, 0, tmpWidth, tmpHeight);\n            brImageData = brCtx.getImageData(0, 0, tmpWidth, tmpHeight);\n            lines = [];\n            for (y = 0; y < tmpHeight; y++) {\n                line = \"\";\n                for (x = 0; x < tmpWidth; x++) {\n                    offset = (y * tmpWidth + x) * 4;\n                    r = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 0] - 128) * contrastFactor) + 128), 255));\n                    g = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 1] - 128) * contrastFactor) + 128), 255));\n                    b = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 2] - 128) * contrastFactor) + 128), 255));\n                    brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;\n                    character = _asciiCharacters[(_asciiCharacters.length - 1) - Math.round(brightness * (_asciiCharacters.length - 1))];\n                    line += character;\n                }\n                lines.push(line);\n            }\n            ctx.fillStyle = \"rgb(255, 255, 255)\";\n            ctx.fillRect(0, 0, offscreen.width, offscreen.height);\n            ctx.fillStyle = \"rgb(0, 0, 0)\";\n            ctx.font = _fontSize + \"px monospace\";\n            for (n = 0; n < lines.length; n++) {\n                ctx.fillText(lines[n], 0, n * _fontSize);\n            }\n            return [2 /*return*/, offscreen];\n        });\n    });\n};\nonmessage = function (event) {\n    return __awaiter(void 0, void 0, void 0, function () {\n        var image, processWidth, processHeight, uid, offscreen, imageBitmap;\n        return __generator(this, function (_a) {\n            switch (_a.label) {\n                case 0:\n                    if (!(event.data.message === const_1.WorkerCommand.INITIALIZE))\n                        return [3 /*break*/, 1];\n                    ctx.postMessage({ message: const_1.WorkerResponse.INITIALIZED });\n                    return [3 /*break*/, 4];\n                case 1:\n                    if (!(event.data.message === const_1.WorkerCommand.PREDICT))\n                        return [3 /*break*/, 3];\n                    image = event.data.image;\n                    processWidth = event.data.processWidth;\n                    processHeight = event.data.processHeight;\n                    uid = event.data.uid;\n                    return [4 /*yield*/, convert(image)];\n                case 2:\n                    offscreen = _a.sent();\n                    imageBitmap = offscreen.transferToImageBitmap();\n                    ctx.postMessage({ message: const_1.WorkerResponse.PREDICTED, uid: uid, image: imageBitmap }, [imageBitmap]);\n                    image.close();\n                    return [3 /*break*/, 4];\n                case 3:\n                    console.log(\"not implemented\");\n                    _a.label = 4;\n                case 4: return [2 /*return*/];\n            }\n        });\n    });\n};\n\n\n//# sourceURL=webpack:///./src/workerAA.ts?./node_modules/ts-loader");

/***/ }),

/***/ "./src/const.ts":
/*!**********************!*\
  !*** ./src/const.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.REQEST_TIMEOUT = exports.BodypixFunctionType = exports.WorkerResponse = exports.WorkerCommand = void 0;\nexports.WorkerCommand = {\n    INITIALIZE: 'initialize',\n    PREDICT: 'predict',\n};\nexports.WorkerResponse = {\n    INITIALIZED: 'initialized',\n    PREDICTED: 'predicted',\n};\nvar BodypixFunctionType;\n(function (BodypixFunctionType) {\n    BodypixFunctionType[BodypixFunctionType[\"SegmentPerson\"] = 0] = \"SegmentPerson\";\n    BodypixFunctionType[BodypixFunctionType[\"SegmentMultiPerson\"] = 1] = \"SegmentMultiPerson\";\n    BodypixFunctionType[BodypixFunctionType[\"SegmentPersonParts\"] = 2] = \"SegmentPersonParts\";\n    BodypixFunctionType[BodypixFunctionType[\"SegmentMultiPersonParts\"] = 3] = \"SegmentMultiPersonParts\"; // Not implemented\n})(BodypixFunctionType = exports.BodypixFunctionType || (exports.BodypixFunctionType = {}));\nexports.REQEST_TIMEOUT = 1000 * 1000 * 30; //  microsecond precision -> performance.now()+REQUEST_TIMEOUT\n\n\n//# sourceURL=webpack:///./src/const.ts?");

/***/ })

/******/ });