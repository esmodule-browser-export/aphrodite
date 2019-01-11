export function stringHash(str) {
    let hash = 5381,
        i    = str.length;

    while(i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
     * integers. Since we want the results to be always positive, convert the
     * signed int to an unsigned by doing an unsigned bitshift. */
    return hash >>> 0;
}

/* ::
type ObjectMap = { [id:string]: any };
*/

const UPPERCASE_RE = /([A-Z])/g;
const UPPERCASE_RE_TO_KEBAB = (match /* : string */)  /* : string */ => `-${match.toLowerCase()}`;

export const kebabifyStyleName = (string /* : string */) /* : string */ => {
    const result = string.replace(UPPERCASE_RE, UPPERCASE_RE_TO_KEBAB);
    if (result[0] === 'm' && result[1] === 's' && result[2] === '-') {
        return `-${result}`;
    }
    return result;
};

/**
 * CSS properties which accept numbers but are not in units of "px".
 * Taken from React's CSSProperty.js
 */
const isUnitlessNumber = {
    animationIterationCount: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridRow: true,
    gridColumn: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,

    // SVG-related properties
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true,
};

/**
 * Taken from React's CSSProperty.js
 *
 * @param {string} prefix vendor-specific prefix, eg: Webkit
 * @param {string} key style name, eg: transitionDuration
 * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
 * WebkitTransitionDuration
 */
function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
}

/**
 * Support style names that may come passed in prefixed by adding permutations
 * of vendor prefixes.
 * Taken from React's CSSProperty.js
 */
const prefixes = ['Webkit', 'ms', 'Moz', 'O'];

// Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
// infinite loop, because it iterates over the newly added props too.
// Taken from React's CSSProperty.js
Object.keys(isUnitlessNumber).forEach(function(prop) {
    prefixes.forEach(function(prefix) {
        isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
    });
});

export const stringifyValue = (
    key /* : string */,
    prop /* : any */
) /* : string */ => {
    if (typeof prop === "number") {
        if (isUnitlessNumber[key]) {
            return "" + prop;
        } else {
            return prop + "px";
        }
    } else {
        return '' + prop;
    }
};

export const stringifyAndImportantifyValue = (
    key /* : string */,
    prop /* : any */
) /* : string */ => importantify(stringifyValue(key, prop));

// Turn a string into a hash string of base-36 values (using letters and numbers)
// eslint-disable-next-line no-unused-vars
export const hashString = (string /* : string */, key /* : ?string */) /* string */ => stringHash(string).toString(36);

// Hash a javascript object using JSON.stringify. This is very fast, about 3
// microseconds on my computer for a sample object:
// http://jsperf.com/test-hashfnv32a-hash/5
//
// Note that this uses JSON.stringify to stringify the objects so in order for
// this to produce consistent hashes browsers need to have a consistent
// ordering of objects. Ben Alpert says that Facebook depends on this, so we
// can probably depend on this too.
export const hashObject = (object /* : ObjectMap */) /* : string */ => hashString(JSON.stringify(object));

// Given a single style value string like the "b" from "a: b;", adds !important
// to generate "b !important".
const importantify = (string /* : string */) /* : string */ => (
    // Bracket string character access is very fast, and in the default case we
    // normally don't expect there to be "!important" at the end of the string
    // so we can use this simple check to take an optimized path. If there
    // happens to be a "!" in this position, we follow up with a more thorough
    // check.
    (string[string.length - 10] === '!' && string.slice(-11) === ' !important')
        ? string
        : `${string} !important`
);

const MAP_EXISTS = typeof Map !== 'undefined';

export class OrderedElements {
    /* ::
    elements: {[string]: any};
    keyOrder: string[];
    */

    constructor() {
        this.elements = {};
        this.keyOrder = [];
    }

    forEach(callback /* : (string, any) => void */) {
        for (let i = 0; i < this.keyOrder.length; i++) {
            // (value, key) to match Map's API
            callback(this.elements[this.keyOrder[i]], this.keyOrder[i]);
        }
    }

    set(key /* : string */, value /* : any */, shouldReorder /* : ?boolean */) {
        if (!this.elements.hasOwnProperty(key)) {
            this.keyOrder.push(key);
        } else if (shouldReorder) {
            const index = this.keyOrder.indexOf(key);
            this.keyOrder.splice(index, 1);
            this.keyOrder.push(key);
        }

        if (value == null) {
            this.elements[key] = value;
            return;
        }

        if ((MAP_EXISTS && value instanceof Map) || value instanceof OrderedElements) {
            // We have found a nested Map, so we need to recurse so that all
            // of the nested objects and Maps are merged properly.
            const nested = this.elements.hasOwnProperty(key)
                ? this.elements[key]
                : new OrderedElements();
            value.forEach((value, key) => {
                nested.set(key, value, shouldReorder);
            });
            this.elements[key] = nested;
            return;
        }

        if (!Array.isArray(value) && typeof value === 'object') {
            // We have found a nested object, so we need to recurse so that all
            // of the nested objects and Maps are merged properly.
            const nested = this.elements.hasOwnProperty(key)
                ? this.elements[key]
                : new OrderedElements();
            const keys = Object.keys(value);
            for (let i = 0; i < keys.length; i += 1) {
                nested.set(keys[i], value[keys[i]], shouldReorder);
            }
            this.elements[key] = nested;
            return;
        }

        this.elements[key] = value;
    }

    get(key /* : string */) /* : any */ {
        return this.elements[key];
    }

    has(key /* : string */) /* : boolean */ {
        return this.elements.hasOwnProperty(key);
    }

    addStyleType(styleType /* : any */) /* : void */ {
        if ((MAP_EXISTS && styleType instanceof Map) || styleType instanceof OrderedElements) {
            styleType.forEach((value, key) => {
                this.set(key, value, true);
            });
        } else {
            const keys = Object.keys(styleType);
            for (let i = 0; i < keys.length; i++) {
                this.set(keys[i], styleType[keys[i]], true);
            }
        }
    }
}

export function capitalizeString(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function prefixProperty(prefixProperties, property, style) {
    if (prefixProperties.hasOwnProperty(property)) {
        var newStyle = {};
        var requiredPrefixes = prefixProperties[property];
        var capitalizedProperty = capitalizeString(property);
        var keys = Object.keys(style);
        for (var i = 0; i < keys.length; i++) {
            var styleProperty = keys[i];
            if (styleProperty === property) {
                for (var j = 0; j < requiredPrefixes.length; j++) {
                    newStyle[requiredPrefixes[j] + capitalizedProperty] = style[property];
                }
            }
            newStyle[styleProperty] = style[styleProperty];
        }
        return newStyle;
    }
    return style;
}

export function prefixValue(plugins, property, value, style, metaData) {
    for (var i = 0, len = plugins.length; i < len; ++i) {
        var processedValue = plugins[i](property, value, style, metaData);

        // we can stop processing if a value is returned
        // as all plugin criteria are unique
        if (processedValue) {
            return processedValue;
        }
    }
}

function addIfNew(list, value) {
    if (list.indexOf(value) === -1) {
        list.push(value);
    }
}

export function addNewValuesOnly(list, values) {
    if (Array.isArray(values)) {
        for (var i = 0, len = values.length; i < len; ++i) {
            addIfNew(list, values[i]);
        }
    } else {
        addIfNew(list, values);
    }
}

export function isObject(value) {
    return value instanceof Object && !Array.isArray(value);
}

export function createPrefixer(_ref) {
    var prefixMap = _ref.prefixMap,
        plugins = _ref.plugins;

    return function prefix(style) {
        for (var property in style) {
            var value = style[property];

            // handle nested objects
            if (isObject(value)) {
                style[property] = prefix(value);
                // handle array values
            } else if (Array.isArray(value)) {
                var combinedValue = [];

                for (var i = 0, len = value.length; i < len; ++i) {
                    var processedValue = prefixValue(plugins, property, value[i], style, prefixMap);
                    addNewValuesOnly(combinedValue, processedValue || value[i]);
                }

                // only modify the value if it was touched
                // by any plugin to prevent unnecessary mutations
                if (combinedValue.length > 0) {
                    style[property] = combinedValue;
                }
            } else {
                var _processedValue = prefixValue(plugins, property, value, style, prefixMap);

                // only modify the value if it was touched
                // by any plugin to prevent unnecessary mutations
                if (_processedValue) {
                    style[property] = _processedValue;
                }

                style = prefixProperty(prefixMap, property, style);
            }
        }

        return style;
    };
}

const isPrefixedValueRegex = /-webkit-|-moz-|-ms-/

export function isPrefixedValue(value) {
    return typeof value === 'string' && isPrefixedValueRegex.test(value)
}

var calcPrefixes = ['-webkit-', '-moz-', ''];

export function calc(property, value) {
    if (typeof value === 'string' && !isPrefixedValue(value) && value.indexOf('calc(') > -1) {
        return calcPrefixes.map(function (prefix) {
            return value.replace(/calc\(/g, prefix + 'calc(');
        });
    }
}

const cursorPrefixes = ['-webkit-', '-moz-', ''];

const cursorValues = {
    'zoom-in': true,
    'zoom-out': true,
    grab: true,
    grabbing: true
};

export function cursor(property, value) {
    if (property === 'cursor' && cursorValues.hasOwnProperty(value)) {
        return cursorPrefixes.map(function (prefix) {
            return prefix + value;
        });
    }
}

const crossFadePrefixes = ['-webkit-', ''];

export function crossFade(property, value) {
    if (typeof value === 'string' && !isPrefixedValue(value) && value.indexOf('cross-fade(') > -1) {
        return crossFadePrefixes.map(function (prefix) {
            return value.replace(/cross-fade\(/g, prefix + 'cross-fade(');
        });
    }
}


var filterPrefixes = ['-webkit-', ''];

export function filter(property, value) {
    if (typeof value === 'string' && !isPrefixedValue(value) && value.indexOf('filter(') > -1) {
        return filterPrefixes.map(function (prefix) {
            return value.replace(/filter\(/g, prefix + 'filter(');
        });
    }
}

var flexValues = {
    flex: ['-webkit-box', '-moz-box', '-ms-flexbox', '-webkit-flex', 'flex'],
    'inline-flex': ['-webkit-inline-box', '-moz-inline-box', '-ms-inline-flexbox', '-webkit-inline-flex', 'inline-flex']
};

export function flex(property, value) {
    if (property === 'display' && flexValues.hasOwnProperty(value)) {
        return flexValues[value];
    }
}

var alternativeValues = {
    'space-around': 'justify',
    'space-between': 'justify',
    'flex-start': 'start',
    'flex-end': 'end',
    'wrap-reverse': 'multiple',
    wrap: 'multiple'
};lib

var alternativeProps = {
    alignItems: 'WebkitBoxAlign',
    justifyContent: 'WebkitBoxPack',
    flexWrap: 'WebkitBoxLines',
    flexGrow: 'WebkitBoxFlex'
};

export function flexboxOld(property, value, style) {
    if (property === 'flexDirection' && typeof value === 'string') {
        if (value.indexOf('column') > -1) {
            style.WebkitBoxOrient = 'vertical';
        } else {
            style.WebkitBoxOrient = 'horizontal';
        }
        if (value.indexOf('reverse') > -1) {
            style.WebkitBoxDirection = 'reverse';
        } else {
            style.WebkitBoxDirection = 'normal';
        }
    }
    if (alternativeProps.hasOwnProperty(property)) {
        style[alternativeProps[property]] = alternativeValues[value] || value;
    }
}

var gradientPrefixes = ['-webkit-', '-moz-', ''];
var gradientValues = /linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient/gi;

export function gradient(property, value) {
    if (typeof value === 'string' && !isPrefixedValue(value) && gradientValues.test(value)) {
        return gradientPrefixes.map(function (prefix) {
            return value.replace(gradientValues, function (grad) {
                return prefix + grad;
            });
        });
    }
}

var imageSetPrefixes = ['-webkit-', ''];

export function imageSet(property, value) {
    if (typeof value === 'string' && !isPrefixedValue(value) && value.indexOf('image-set(') > -1) {
        return imageSetPrefixes.map(function (prefix) {
            return value.replace(/image-set\(/g, prefix + 'image-set(');
        });
    }
}

export function position(property, value) {
    if (property === 'position' && value === 'sticky') {
        return ['-webkit-sticky', 'sticky'];
    }
}

var sizingPrefixes = ['-webkit-', '-moz-', ''];

var sizingProperties = {
    maxHeight: true,
    maxWidth: true,
    width: true,
    height: true,
    columnWidth: true,
    minWidth: true,
    minHeight: true
};
var sizingValues = {
    'min-content': true,
    'max-content': true,
    'fill-available': true,
    'fit-content': true,
    'contain-floats': true
};

export function sizing(property, value) {
    if (sizingProperties.hasOwnProperty(property) && sizingValues.hasOwnProperty(value)) {
        return sizingPrefixes.map(function (prefix) {
            return prefix + value;
        });
    }
}

const uppercasePattern = /[A-Z]/g;
const msPattern = /^ms-/;
const hyphenateStyleNameCache = {};

function hyphenateProperty(string) {
    return string in hyphenateStyleNameCache
        ? hyphenateStyleNameCache[string]
        : hyphenateStyleNameCache[string] = string
            .replace(uppercasePattern, '-$&')
            .toLowerCase()
            .replace(msPattern, '-ms-');
}

var transitionProperties = {
    transition: true,
    transitionProperty: true,
    WebkitTransition: true,
    WebkitTransitionProperty: true,
    MozTransition: true,
    MozTransitionProperty: true
};

var transitionPrefixMapping = {
    Webkit: '-webkit-',
    Moz: '-moz-',
    ms: '-ms-'
};

function transitionPrefixValue(value, propertyPrefixMap) {
    if (isPrefixedValue(value)) {
        return value;
    }

    // only split multi values, not cubic beziers
    var multipleValues = value.split(/,(?![^()]*(?:\([^()]*\))?\))/g);

    for (var i = 0, len = multipleValues.length; i < len; ++i) {
        var singleValue = multipleValues[i];
        var values = [singleValue];
        for (var property in propertyPrefixMap) {
            var dashCaseProperty = hyphenateProperty(property);

            if (singleValue.indexOf(dashCaseProperty) > -1 && dashCaseProperty !== 'order') {
                var prefixes = propertyPrefixMap[property];
                for (var j = 0, pLen = prefixes.length; j < pLen; ++j) {
                    // join all prefixes and create a new value
                    values.unshift(singleValue.replace(dashCaseProperty, transitionPrefixMapping[prefixes[j]] + dashCaseProperty));
                }
            }
        }

        multipleValues[i] = values.join(',');
    }

    return multipleValues.join(',');
}

export function transition(property, value, style, propertyPrefixMap) {
    // also check for already prefixed transitions
    if (typeof value === 'string' && transitionProperties.hasOwnProperty(property)) {
        var outputValue = prefixValue(value, propertyPrefixMap);
        // if the property is already prefixed
        var webkitOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function (val) {
            return !/-moz-|-ms-/.test(val);
        }).join(',');

        if (property.indexOf('Webkit') > -1) {
            return webkitOutput;
        }

        var mozOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function (val) {
            return !/-webkit-|-ms-/.test(val);
        }).join(',');

        if (property.indexOf('Moz') > -1) {
            return mozOutput;
        }

        style['Webkit' + capitalizeString(property)] = webkitOutput;
        style['Moz' + capitalizeString(property)] = mozOutput;
        return outputValue;
    }
}

var flexboxIEAlternativeValues = {
    'space-around': 'distribute',
    'space-between': 'justify',
    'flex-start': 'start',
    'flex-end': 'end'
};
var flexboxIEAlternativeProps = {
    alignContent: 'msFlexLinePack',
    alignSelf: 'msFlexItemAlign',
    alignItems: 'msFlexAlign',
    justifyContent: 'msFlexPack',
    order: 'msFlexOrder',
    flexGrow: 'msFlexPositive',
    flexShrink: 'msFlexNegative',
    flexBasis: 'msFlexPreferredSize'
    // Full expanded syntax is flex-grow | flex-shrink | flex-basis.
};
var flexboxIEFlexShorthandMappings = {
    auto: '1 1 auto',
    inherit: 'inherit',
    initial: '0 1 auto',
    none: '0 0 auto',
    unset: 'unset'
};
var flexboxIEIsUnitlessNumber = /^\d+(\.\d+)?$/;

export function flexboxIE(property, value, style) {
    if (Object.prototype.hasOwnProperty.call(alternativeProps, property)) {
        style[flexboxIEAlternativeProps[property]] = flexboxIEAlternativeValues[value] || value;
    }
    if (property === 'flex') {
        // For certain values we can do straight mappings based on the spec
        // for the expansions.
        if (Object.prototype.hasOwnProperty.call(flexboxIEFlexShorthandMappings, value)) {
            style.msFlex = flexboxIEFlexShorthandMappings[value];
            return;
        }
        // Here we have no direct mapping, so we favor looking for a
        // unitless positive number as that will be the most common use-case.
        if (flexboxIEIsUnitlessNumber.test(value)) {
            style.msFlex = value + ' 1 0%';
            return;
        }

        // The next thing we can look for is if there are multiple values.
        var flexValues = value.split(/\s/);
        // If we only have a single value that wasn't a positive unitless
        // or a pre-mapped value, then we can assume it is a unit value.
        switch (flexValues.length) {
            case 1:
                style.msFlex = '1 1 ' + value;
                return;
            case 2:
                // If we have 2 units, then we expect that the first will
                // always be a unitless number and represents flex-grow.
                // The second unit will represent flex-shrink for a unitless
                // value, or flex-basis otherwise.
                if (flexboxIEIsUnitlessNumber.test(flexValues[1])) {
                    style.msFlex = flexValues[0] + ' ' + flexValues[1] + ' 0%';
                } else {
                    style.msFlex = flexValues[0] + ' 1 ' + flexValues[1];
                }
                return;
            default:
                style.msFlex = value;
        }
    }
}

var w = ["Webkit"];
var m = ["Moz"];
var ms = ["ms"];
var wm = ["Webkit","Moz"];
var wms = ["Webkit","ms"];
var wmms = ["Webkit","Moz","ms"];

const staticData =  {
    plugins: [calc,crossFade,cursor,filter,flex,flexboxIE,flexboxOld,gradient,imageSet,position,sizing,transition],
    prefixMap: {"transform":wms,"transformOrigin":wms,"transformOriginX":wms,"transformOriginY":wms,"backfaceVisibility":w,"perspective":w,"perspectiveOrigin":w,"transformStyle":w,"transformOriginZ":w,"animation":w,"animationDelay":w,"animationDirection":w,"animationFillMode":w,"animationDuration":w,"animationIterationCount":w,"animationName":w,"animationPlayState":w,"animationTimingFunction":w,"appearance":wm,"userSelect":wmms,"fontKerning":w,"textEmphasisPosition":w,"textEmphasis":w,"textEmphasisStyle":w,"textEmphasisColor":w,"boxDecorationBreak":w,"clipPath":w,"maskImage":w,"maskMode":w,"maskRepeat":w,"maskPosition":w,"maskClip":w,"maskOrigin":w,"maskSize":w,"maskComposite":w,"mask":w,"maskBorderSource":w,"maskBorderMode":w,"maskBorderSlice":w,"maskBorderWidth":w,"maskBorderOutset":w,"maskBorderRepeat":w,"maskBorder":w,"maskType":w,"textDecorationStyle":wm,"textDecorationSkip":wm,"textDecorationLine":wm,"textDecorationColor":wm,"filter":w,"fontFeatureSettings":wm,"breakAfter":wmms,"breakBefore":wmms,"breakInside":wmms,"columnCount":wm,"columnFill":wm,"columnGap":wm,"columnRule":wm,"columnRuleColor":wm,"columnRuleStyle":wm,"columnRuleWidth":wm,"columns":wm,"columnSpan":wm,"columnWidth":wm,"writingMode":wms,"flex":wms,"flexBasis":w,"flexDirection":wms,"flexGrow":w,"flexFlow":wms,"flexShrink":w,"flexWrap":wms,"alignContent":w,"alignItems":w,"alignSelf":w,"justifyContent":w,"order":w,"transitionDelay":w,"transitionDuration":w,"transitionProperty":w,"transitionTimingFunction":w,"backdropFilter":w,"scrollSnapType":wms,"scrollSnapPointsX":wms,"scrollSnapPointsY":wms,"scrollSnapDestination":wms,"scrollSnapCoordinate":wms,"shapeImageThreshold":w,"shapeImageMargin":w,"shapeImageOutside":w,"hyphens":wmms,"flowInto":wms,"flowFrom":wms,"regionFragment":wms,"textOrientation":w,"boxSizing":m,"textAlignLast":m,"tabSize":m,"wrapFlow":ms,"wrapThrough":ms,"wrapMargin":ms,"touchAction":ms,"gridTemplateColumns":ms,"gridTemplateRows":ms,"gridTemplateAreas":ms,"gridTemplate":ms,"gridAutoColumns":ms,"gridAutoRows":ms,"gridAutoFlow":ms,"grid":ms,"gridRowStart":ms,"gridColumnStart":ms,"gridRowEnd":ms,"gridRow":ms,"gridColumn":ms,"gridColumnEnd":ms,"gridColumnGap":ms,"gridRowGap":ms,"gridArea":ms,"gridGap":ms,"textSizeAdjust":["ms","Webkit"],"borderImage":w,"borderImageOutset":w,"borderImageRepeat":w,"borderImageSlice":w,"borderImageSource":w,"borderImageWidth":w}
}


const prefixAll = createPrefixer(staticData);

/* ::
import type { SheetDefinition } from './index.js';
type StringHandlers = { [id:string]: Function };
type SelectorCallback = (selector: string) => string[];
export type SelectorHandler = (
    selector: string,
    baseSelector: string,
    callback: SelectorCallback
) => string[] | string | null;
*/

/**
 * `selectorHandlers` are functions which handle special selectors which act
 * differently than normal style definitions. These functions look at the
 * current selector and can generate CSS for the styles in their subtree by
 * calling the callback with a new selector.
 *
 * For example, when generating styles with a base selector of '.foo' and the
 * following styles object:
 *
 *   {
 *     ':nth-child(2n)': {
 *       ':hover': {
 *         color: 'red'
 *       }
 *     }
 *   }
 *
 * when we reach the ':hover' style, we would call our selector handlers like
 *
 *   handler(':hover', '.foo:nth-child(2n)', callback)
 *
 * Since our `pseudoSelectors` handles ':hover' styles, that handler would call
 * the callback like
 *
 *   callback('.foo:nth-child(2n):hover')
 *
 * to generate its subtree `{ color: 'red' }` styles with a
 * '.foo:nth-child(2n):hover' selector. The callback would return an array of CSS
 * rules like
 *
 *   ['.foo:nth-child(2n):hover{color:red !important;}']
 *
 * and the handler would then return that resulting CSS.
 *
 * `defaultSelectorHandlers` is the list of default handlers used in a call to
 * `generateCSS`.
 *
 * @name SelectorHandler
 * @function
 * @param {string} selector: The currently inspected selector. ':hover' in the
 *     example above.
 * @param {string} baseSelector: The selector of the parent styles.
 *     '.foo:nth-child(2n)' in the example above.
 * @param {function} generateSubtreeStyles: A function which can be called to
 *     generate CSS for the subtree of styles corresponding to the selector.
 *     Accepts a new baseSelector to use for generating those styles.
 * @returns {string[] | string | null} The generated CSS for this selector, or
 *     null if we don't handle this selector.
 */
export const defaultSelectorHandlers /* : SelectorHandler[] */ = [
    // Handle pseudo-selectors, like :hover and :nth-child(3n)
    function pseudoSelectors(selector, baseSelector, generateSubtreeStyles) {
        if (selector[0] !== ":") {
            return null;
        }
        return generateSubtreeStyles(baseSelector + selector);
    },

    // Handle media queries (or font-faces)
    function mediaQueries(selector, baseSelector, generateSubtreeStyles) {
        if (selector[0] !== "@") {
            return null;
        }
        // Generate the styles normally, and then wrap them in the media query.
        const generated = generateSubtreeStyles(baseSelector);
        return [`${selector}{${generated.join('')}}`];
    },
];

/**
 * Generate CSS for a selector and some styles.
 *
 * This function handles the media queries and pseudo selectors that can be used
 * in aphrodite styles.
 *
 * @param {string} selector: A base CSS selector for the styles to be generated
 *     with.
 * @param {Object} styleTypes: A list of properties of the return type of
 *     StyleSheet.create, e.g. [styles.red, styles.blue].
 * @param {Array.<SelectorHandler>} selectorHandlers: A list of selector
 *     handlers to use for handling special selectors. See
 *     `defaultSelectorHandlers`.
 * @param stringHandlers: See `generateCSSRuleset`
 * @param useImportant: See `generateCSSRuleset`
 *
 * To actually generate the CSS special-construct-less styles are passed to
 * `generateCSSRuleset`.
 *
 * For instance, a call to
 *
 *     generateCSS(".foo", [{
 *       color: "red",
 *       "@media screen": {
 *         height: 20,
 *         ":hover": {
 *           backgroundColor: "black"
 *         }
 *       },
 *       ":active": {
 *         fontWeight: "bold"
 *       }
 *     }], defaultSelectorHandlers);
 *
 * with the default `selectorHandlers` will make 5 calls to
 * `generateCSSRuleset`:
 *
 *     generateCSSRuleset(".foo", { color: "red" }, ...)
 *     generateCSSRuleset(".foo:active", { fontWeight: "bold" }, ...)
 *     // These 2 will be wrapped in @media screen {}
 *     generateCSSRuleset(".foo", { height: 20 }, ...)
 *     generateCSSRuleset(".foo:hover", { backgroundColor: "black" }, ...)
 */
export const generateCSS = (
    selector /* : string */,
    styleTypes /* : SheetDefinition[] */,
    selectorHandlers /* : SelectorHandler[] */,
    stringHandlers /* : StringHandlers */,
    useImportant /* : boolean */
) /* : string[] */ => {
    const merged = new OrderedElements();

    for (let i = 0; i < styleTypes.length; i++) {
        merged.addStyleType(styleTypes[i]);
    }

    const plainDeclarations = new OrderedElements();
    const generatedStyles = [];

    // TODO(emily): benchmark this to see if a plain for loop would be faster.
    merged.forEach((val, key) => {
        // For each key, see if one of the selector handlers will handle these
        // styles.
        const foundHandler = selectorHandlers.some(handler => {
            const result = handler(key, selector, (newSelector) => {
                return generateCSS(
                    newSelector, [val], selectorHandlers,
                    stringHandlers, useImportant);
            });
            if (result != null) {
                // If the handler returned something, add it to the generated
                // CSS and stop looking for another handler.
                if (Array.isArray(result)) {
                    generatedStyles.push(...result);
                } else {
                    // eslint-disable-next-line
                    console.warn(
                        'WARNING: Selector handlers should return an array of rules.' +
                        'Returning a string containing multiple rules is deprecated.',
                        handler,
                    );
                    generatedStyles.push(`@media all {${result}}`);
                }
                return true;
            }
        });
        // If none of the handlers handled it, add it to the list of plain
        // style declarations.
        if (!foundHandler) {
            plainDeclarations.set(key, val, true);
        }
    });
    const generatedRuleset = generateCSSRuleset(
        selector,
        plainDeclarations,
        stringHandlers,
        useImportant,
        selectorHandlers,
    );


    if (generatedRuleset) {
        generatedStyles.unshift(generatedRuleset);
    }

    return generatedStyles;
};

/**
 * Helper method of generateCSSRuleset to facilitate custom handling of certain
 * CSS properties. Used for e.g. font families.
 *
 * See generateCSSRuleset for usage and documentation of paramater types.
 */
const runStringHandlers = (
    declarations /* : OrderedElements */,
    stringHandlers /* : StringHandlers */,
    selectorHandlers /* : SelectorHandler[] */
) /* : void */ => {
    if (!stringHandlers) {
        return;
    }

    const stringHandlerKeys = Object.keys(stringHandlers);
    for (let i = 0; i < stringHandlerKeys.length; i++) {
        const key = stringHandlerKeys[i];
        if (declarations.has(key)) {
            // A declaration exists for this particular string handler, so we
            // need to let the string handler interpret the declaration first
            // before proceeding.
            //
            // TODO(emily): Pass in a callback which generates CSS, similar to
            // how our selector handlers work, instead of passing in
            // `selectorHandlers` and have them make calls to `generateCSS`
            // themselves. Right now, this is impractical because our string
            // handlers are very specialized and do complex things.
            declarations.set(
                key,
                stringHandlers[key](declarations.get(key), selectorHandlers),

                // Preserve order here, since we are really replacing an
                // unprocessed style with a processed style, not overriding an
                // earlier style
                false
            );
        }
    }
};


const transformRule = (
    key /* : string */,
    value /* : string */,
    transformValue /* : function */
) /* : string */ => (
    `${kebabifyStyleName(key)}:${transformValue(key, value)};`
);


const arrayToObjectKeysReducer = (acc, val) => {
    acc[val] = true;
    return acc;
};

/**
 * Generate a CSS ruleset with the selector and containing the declarations.
 *
 * This function assumes that the given declarations don't contain any special
 * children (such as media queries, pseudo-selectors, or descendant styles).
 *
 * Note that this method does not deal with nesting used for e.g.
 * psuedo-selectors or media queries. That responsibility is left to  the
 * `generateCSS` function.
 *
 * @param {string} selector: the selector associated with the ruleset
 * @param {Object} declarations: a map from camelCased CSS property name to CSS
 *     property value.
 * @param {Object.<string, function>} stringHandlers: a map from camelCased CSS
 *     property name to a function which will map the given value to the value
 *     that is output.
 * @param {bool} useImportant: A boolean saying whether to append "!important"
 *     to each of the CSS declarations.
 * @returns {string} A string of raw CSS.
 *
 * Examples:
 *
 *    generateCSSRuleset(".blah", { color: "red" })
 *    -> ".blah{color: red !important;}"
 *    generateCSSRuleset(".blah", { color: "red" }, {}, false)
 *    -> ".blah{color: red}"
 *    generateCSSRuleset(".blah", { color: "red" }, {color: c => c.toUpperCase})
 *    -> ".blah{color: RED}"
 *    generateCSSRuleset(".blah:hover", { color: "red" })
 *    -> ".blah:hover{color: red}"
 */
export const generateCSSRuleset = (
    selector /* : string */,
    declarations /* : OrderedElements */,
    stringHandlers /* : StringHandlers */,
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */
) /* : string */ => {
    // Mutates declarations
    runStringHandlers(declarations, stringHandlers, selectorHandlers);

    const originalElements = Object.keys(declarations.elements)
        .reduce(arrayToObjectKeysReducer, Object.create(null));

    // NOTE(emily): This mutates handledDeclarations.elements.
    const prefixedElements = prefixAll(declarations.elements);

    const elementNames = Object.keys(prefixedElements);
    if (elementNames.length !== declarations.keyOrder.length) {
        // There are some prefixed values, so we need to figure out how to sort
        // them.
        //
        // Loop through prefixedElements, looking for anything that is not in
        // sortOrder, which means it was added by prefixAll. This means that we
        // need to figure out where it should appear in the sortOrder.
        for (let i = 0; i < elementNames.length; i++) {
            if (!originalElements[elementNames[i]]) {
                // This element is not in the sortOrder, which means it is a prefixed
                // value that was added by prefixAll. Let's try to figure out where it
                // goes.
                let originalStyle;
                if (elementNames[i][0] === 'W') {
                    // This is a Webkit-prefixed style, like "WebkitTransition". Let's
                    // find its original style's sort order.
                    originalStyle = elementNames[i][6].toLowerCase() + elementNames[i].slice(7);
                } else if (elementNames[i][1] === 'o') {
                    // This is a Moz-prefixed style, like "MozTransition". We check
                    // the second character to avoid colliding with Ms-prefixed
                    // styles. Let's find its original style's sort order.
                    originalStyle = elementNames[i][3].toLowerCase() + elementNames[i].slice(4);
                } else { // if (elementNames[i][1] === 's') {
                    // This is a Ms-prefixed style, like "MsTransition".
                    originalStyle = elementNames[i][2].toLowerCase() + elementNames[i].slice(3);
                }

                if (originalStyle && originalElements[originalStyle]) {
                    const originalIndex = declarations.keyOrder.indexOf(originalStyle);
                    declarations.keyOrder.splice(originalIndex, 0, elementNames[i]);
                } else {
                    // We don't know what the original style was, so sort it to
                    // top. This can happen for styles that are added that don't
                    // have the same base name as the original style.
                    declarations.keyOrder.unshift(elementNames[i]);
                }
            }
        }
    }

    const transformValue = (useImportant === false)
        ? stringifyValue
        : stringifyAndImportantifyValue;

    const rules = [];
    for (let i = 0; i < declarations.keyOrder.length; i ++) {
        const key = declarations.keyOrder[i];
        const value = prefixedElements[key];
        if (Array.isArray(value)) {
            // inline-style-prefixer returns an array when there should be
            // multiple rules for the same key. Here we flatten to multiple
            // pairs with the same key.
            for (let j = 0; j < value.length; j++) {
                rules.push(transformRule(key, value[j], transformValue));
            }
        } else {
            rules.push(transformRule(key, value, transformValue));
        }
    }

    if (rules.length) {
        return `${selector}{${rules.join("")}}`;
    } else {
        return "";
    }
};

class Raw {

    // Use the fastest means possible to execute a task in its own turn, with
    // priority over other events including IO, animation, reflow, and redraw
    // events in browsers.
    //
    // An exception thrown by a task will permanently interrupt the processing of
    // subsequent tasks. The higher level `asap` function ensures that if an
    // exception is thrown by a task, that the task queue will continue flushing as
    // soon as possible, but if you use `rawAsap` directly, you are responsible to
    // either ensure that no exceptions are thrown from your task, or to manually
    // call `rawAsap.requestFlush` if an exception is thrown.
    constructor() {
        this.queue = []
        // Once a flush has been requested, no further calls to `requestFlush` are
        // necessary until the next `flush` completes.
        this.flushing = false
        // `requestFlush` is an implementation-specific method that attempts to kick
        // off a `flush` event as quickly as possible. `flush` will attempt to exhaust
        // the event queue before yielding to the browser's own event loop.

        // The position of the next task to execute in the task queue. This is
        // preserved between calls to `flush` so that it can be resumed if
        // a task throws an exception.
        this.index = 0
        // If a task schedules additional tasks recursively, the task queue can grow
        // unbounded. To prevent memory exhaustion, the task queue will periodically
        // truncate already-completed tasks.
        this.capacity = 1024


        this.flush = this.flush.bind(this)

        this.scope = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : self)
        this.BrowserMutationObserver = this.scope.MutationObserver || this.scope.WebKitMutationObserver;

        this.makeRequestCallFromMutationObserver = this.makeRequestCallFromMutationObserver.bind(this)
        this.makeRequestCallFromTimer = this.makeRequestCallFromTimer.bind(this)

        if (typeof this.BrowserMutationObserver === "function") {
            this.requestFlush = this.makeRequestCallFromMutationObserver(this.flush);
        } else {
            this.requestFlush = this.makeRequestCallFromTimer(this.flush);
        }

        // `requestFlush` requests that the high priority event queue be flushed as
        // soon as possible.
        // This is useful to prevent an error thrown in a task from stalling the event
        // queue if the exception handled by Node.js’s
        // `process.on("uncaughtException")` or by a domain.
        this.requestFlush = this.requestFlush.bind(this)

        this.rawAsap = this.rawAsap.bind(this)
    }

    rawAsap(task) {
        if (!this.queue.length) {
            this.requestFlush();
            this.flushing = true;
        }
        // Equivalent to push, but avoids a function call.
        this.queue[this.queue.length] = task;
    }

    // The flush function processes all tasks that have been scheduled with
    // `rawAsap` unless and until one of those tasks throws an exception.
    // If a task throws an exception, `flush` ensures that its state will remain
    // consistent and will resume where it left off when called again.
    // However, `flush` does not make any arrangements to be called again if an
    // exception is thrown.
    flush() {
        while (this.index < this.queue.length) {
            var currentIndex = this.index;
            // Advance the index before calling the task. This ensures that we will
            // begin flushing on the next task the task throws an error.
            this.index = this.index + 1;
            this.queue[currentIndex].call();
            // Prevent leaking memory for long chains of recursive calls to `asap`.
            // If we call `asap` within tasks scheduled by `asap`, the queue will
            // grow, but to avoid an O(n) walk for every task we execute, we don't
            // shift tasks off the queue after they have been executed.
            // Instead, we periodically shift 1024 tasks off the queue.
            if (this.index > this.capacity) {
                // Manually shift all values starting at the index back to the
                // beginning of the queue.
                for (var scan = 0, newLength = this.queue.length - this.index; scan < newLength; scan++) {
                    this.queue[scan] = this.queue[scan + this.index];
                }
                this.queue.length -= this.index;
                this.index = 0;
            }
        }
        this.queue.length = 0;
        this.index = 0;
        this.flushing = false;
    }

    // To request a high priority event, we induce a mutation observer by toggling
    // the text of a text node between "1" and "-1".
    makeRequestCallFromMutationObserver(callback) {
        var toggle = 1;
        var observer = new this.BrowserMutationObserver(callback);
        var node = document.createTextNode("");
        observer.observe(node, {characterData: true});
        return function requestCall() {
            toggle = -toggle;
            node.data = toggle;
        };
    }

    makeRequestCallFromTimer(callback) {
        return function requestCall() {
            // We dispatch a timeout with a specified delay of 0 for engines that
            // can reliably accommodate that request. This will usually be snapped
            // to a 4 milisecond delay, but once we're flushing, there's no delay
            // between events.
            var timeoutHandle = setTimeout(handleTimer, 0);
            // However, since this timer gets frequently dropped in Firefox
            // workers, we enlist an interval handle that will try to fire
            // an event 20 times per second until it succeeds.
            var intervalHandle = setInterval(handleTimer, 50);

            function handleTimer() {
                // Whichever timer succeeds will cancel both timers and
                // execute the callback.
                clearTimeout(timeoutHandle);
                clearInterval(intervalHandle);
                callback();
            }
        };
    }

}

class Asap extends Raw {

    constructor(){
        super()
        // RawTasks are recycled to reduce GC churn.
        this.freeTasks = [];
        // We queue errors to ensure they are thrown in right order (FIFO).
        // Array-as-queue is good enough here, since we are just dealing with exceptions.
        this.pendingErrors = [];
        this.throwFirstError = this.throwFirstError.bind(this)
        this.requestErrorThrow = this.makeRequestCallFromTimer(this.throwFirstError);

        this.getRawTask = this.getRawTask.bind(this)
        this.asap = this.asap.bind(this)
    }

    throwFirstError() {
        if (this.pendingErrors.length) {
            throw this.pendingErrors.shift();
        }
    }

    /**
     * Calls a task as soon as possible after returning, in its own event, with priority
     * over other events like animation, reflow, and repaint. An error thrown from an
     * event will not interrupt, nor even substantially slow down the processing of
     * other events, but will be rather postponed to a lower priority event.
     * @param {{call}} task A callable object, typically a function that takes no
     * arguments.
     */
    asap(task) {
        var rawTask;
        if (this.freeTasks.length) {
            rawTask = this.freeTasks.pop();
        } else {
            rawTask = this.getRawTask();
        }
        rawTask.task = task;
        this.rawAsap(rawTask);
    }

    // We wrap tasks with recyclable task objects.  A task object implements
    // `call`, just like a function.
    getRawTask() {
        let self = this
        let asap = self.asap

        return {
            task: null,
            // The sole purpose of wrapping the task is to catch the exception and recycle
            // the task object after its single use.
            call: function(){
                let rawTask = this
                try {
                    rawTask.task.call();
                } catch (error) {
                    if (asap.onerror) {
                        // This hook exists purely for testing purposes.
                        // Its name will be periodically randomized to break any code that
                        // depends on its existence.
                        asap.onerror(error);
                    } else {
                        // In a web browser, exceptions are not fatal. However, to avoid
                        // slowing down the queue of pending tasks, we rethrow the error in a
                        // lower priority turn.
                        self.pendingErrors.push(error);
                        self.requestErrorThrow();
                    }
                } finally {
                    rawTask.task = null;
                    self.freeTasks[self.freeTasks.length] = rawTask;
                }
            }
        }
    }

}

const asap = (new Asap()).asap

// The current <style> tag we are inserting into, or null if we haven't
// inserted anything yet. We could find this each time using
// `document.querySelector("style[data-aphrodite"])`, but holding onto it is
// faster.
let styleTag /* : ?HTMLStyleElement */ = null;

// Inject a set of rules into a <style> tag in the head of the document. This
// will automatically create a style tag and then continue to use it for
// multiple injections. It will also use a style tag with the `data-aphrodite`
// tag on it if that exists in the DOM. This could be used for e.g. reusing the
// same style tag that server-side rendering inserts.
const injectStyleTag = (cssRules /* : string[] */) => {
    if (styleTag == null) {
        // Try to find a style tag with the `data-aphrodite` attribute first.
        styleTag = ((document.querySelector("style[data-aphrodite]") /* : any */) /* : ?HTMLStyleElement */);

        // If that doesn't work, generate a new style tag.
        if (styleTag == null) {
            // Taken from
            // http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
            const head = document.head || document.getElementsByTagName('head')[0];
            styleTag = document.createElement('style');

            styleTag.type = 'text/css';
            styleTag.setAttribute("data-aphrodite", "");
            head.appendChild(styleTag);
        }
    }

    // $FlowFixMe
    const sheet = ((styleTag.styleSheet || styleTag.sheet /* : any */) /* : CSSStyleSheet */);

    if (sheet.insertRule) {
        let numRules = sheet.cssRules.length;
        cssRules.forEach((rule) => {
            try {
                sheet.insertRule(rule, numRules);
                numRules += 1;
            } catch(e) {
                // The selector for this rule wasn't compatible with the browser
            }
        });
    } else {
        styleTag.innerText = (styleTag.innerText || '') + cssRules.join('');
    }
};

// Custom handlers for stringifying CSS values that have side effects
// (such as fontFamily, which can cause @font-face rules to be injected)
const stringHandlers = {
    // With fontFamily we look for objects that are passed in and interpret
    // them as @font-face rules that we need to inject. The value of fontFamily
    // can either be a string (as normal), an object (a single font face), or
    // an array of objects and strings.
    fontFamily: function fontFamily(val) {
        if (Array.isArray(val)) {
            const nameMap = {};

            val.forEach(v => {
                nameMap[fontFamily(v)] = true;
            });

            return Object.keys(nameMap).join(",");
        } else if (typeof val === "object") {
            injectStyleOnce(val.src, "@font-face", [val], false);
            return `"${val.fontFamily}"`;
        } else {
            return val;
        }
    },

    // With animationName we look for an object that contains keyframes and
    // inject them as an `@keyframes` block, returning a uniquely generated
    // name. The keyframes object should look like
    //  animationName: {
    //    from: {
    //      left: 0,
    //      top: 0,
    //    },
    //    '50%': {
    //      left: 15,
    //      top: 5,
    //    },
    //    to: {
    //      left: 20,
    //      top: 20,
    //    }
    //  }
    // TODO(emily): `stringHandlers` doesn't let us rename the key, so I have
    // to use `animationName` here. Improve that so we can call this
    // `animation` instead of `animationName`.
    animationName: function animationName(val, selectorHandlers) {
        if (Array.isArray(val)) {
            return val.map(v => animationName(v, selectorHandlers)).join(",");
        } else if (typeof val === "object") {
            // Generate a unique name based on the hash of the object. We can't
            // just use the hash because the name can't start with a number.
            // TODO(emily): this probably makes debugging hard, allow a custom
            // name?
            const name = `keyframe_${hashObject(val)}`;

            // Since keyframes need 3 layers of nesting, we use `generateCSS` to
            // build the inner layers and wrap it in `@keyframes` ourselves.
            let finalVal = `@keyframes ${name}{`;

            // TODO see if we can find a way where checking for OrderedElements
            // here is not necessary. Alternatively, perhaps we should have a
            // utility method that can iterate over either a plain object, an
            // instance of OrderedElements, or a Map, and then use that here and
            // elsewhere.
            if (val instanceof OrderedElements) {
                val.forEach((valVal, valKey) => {
                    finalVal += generateCSS(
                        valKey, [valVal], selectorHandlers, stringHandlers, false).join('');
                });
            } else {
                Object.keys(val).forEach(key => {
                    finalVal += generateCSS(
                        key, [val[key]], selectorHandlers, stringHandlers, false).join('');
                });
            }
            finalVal += '}';

            injectGeneratedCSSOnce(name, [finalVal]);

            return name;
        } else {
            return val;
        }
    },
};

// This is a map from Aphrodite's generated class names to `true` (acting as a
// set of class names)
let alreadyInjected = {};

// This is the buffer of styles which have not yet been flushed.
let injectionBuffer /* : string[] */ = [];

// A flag to tell if we are already buffering styles. This could happen either
// because we scheduled a flush call already, so newly added styles will
// already be flushed, or because we are statically buffering on the server.
let isBuffering = false;

const injectGeneratedCSSOnce = (key, generatedCSS) => {
    if (alreadyInjected[key]) {
        return;
    }

    if (!isBuffering) {
        // We should never be automatically buffering on the server (or any
        // place without a document), so guard against that.
        if (typeof document === "undefined") {
            throw new Error(
                "Cannot automatically buffer without a document");
        }

        // If we're not already buffering, schedule a call to flush the
        // current styles.
        isBuffering = true;
        asap(flushToStyleTag);
    }

    injectionBuffer.push(...generatedCSS);
    alreadyInjected[key] = true;
}

export const injectStyleOnce = (
    key /* : string */,
    selector /* : string */,
    definitions /* : SheetDefinition[] */,
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */ = []
) => {
    if (alreadyInjected[key]) {
        return;
    }

    const generated = generateCSS(
        selector, definitions, selectorHandlers,
        stringHandlers, useImportant);

    injectGeneratedCSSOnce(key, generated);
};

export const reset = () => {
    injectionBuffer = [];
    alreadyInjected = {};
    isBuffering = false;
    styleTag = null;
};

export const getBufferedStyles = () => {
    return injectionBuffer;
}

export const startBuffering = () => {
    if (isBuffering) {
        throw new Error(
            "Cannot buffer while already buffering");
    }
    isBuffering = true;
};

const flushToArray = () => {
    isBuffering = false;
    const ret = injectionBuffer;
    injectionBuffer = [];
    return ret;
};

export const flushToString = () => {
    return flushToArray().join('');
};

export const flushToStyleTag = () => {
    const cssRules = flushToArray();
    if (cssRules.length > 0) {
        injectStyleTag(cssRules);
    }
};

export const getRenderedClassNames = () /* : string[] */ => {
    return Object.keys(alreadyInjected);
};

export const addRenderedClassNames = (classNames /* : string[] */) => {
    classNames.forEach(className => {
        alreadyInjected[className] = true;
    });
};

const processStyleDefinitions = (
    styleDefinitions /* : any[] */,
    classNameBits /* : string[] */,
    definitionBits /* : Object[] */,
    length /* : number */,
) /* : number */ => {
    for (let i = 0; i < styleDefinitions.length; i += 1) {
        // Filter out falsy values from the input, to allow for
        // `css(a, test && c)`
        if (styleDefinitions[i]) {
            if (Array.isArray(styleDefinitions[i])) {
                // We've encountered an array, so let's recurse
                length += processStyleDefinitions(
                    styleDefinitions[i],
                    classNameBits,
                    definitionBits,
                    length,
                );
            } else {
                classNameBits.push(styleDefinitions[i]._name);
                definitionBits.push(styleDefinitions[i]._definition);
                length += styleDefinitions[i]._len;
            }
        }
    }
    return length;
};

/**
 * Inject styles associated with the passed style definition objects, and return
 * an associated CSS class name.
 *
 * @param {boolean} useImportant If true, will append !important to generated
 *     CSS output. e.g. {color: red} -> "color: red !important".
 * @param {(Object|Object[])[]} styleDefinitions style definition objects, or
 *     arbitrarily nested arrays of them, as returned as properties of the
 *     return value of StyleSheet.create().
 */
export const injectAndGetClassName = (
    useImportant /* : boolean */,
    styleDefinitions /* : MaybeSheetDefinition[] */,
    selectorHandlers /* : SelectorHandler[] */
) /* : string */ => {
    const classNameBits = [];
    const definitionBits = [];

    // Mutates classNameBits and definitionBits and returns a length which we
    // will append to the hash to decrease the chance of hash collisions.
    const length = processStyleDefinitions(
        styleDefinitions,
        classNameBits,
        definitionBits,
        0,
    );

    // Break if there aren't any valid styles.
    if (classNameBits.length === 0) {
        return "";
    }

    let className;
    if (process.env.NODE_ENV === 'production') {
        className = classNameBits.length === 1 ?
            `_${classNameBits[0]}` :
            `_${hashString(classNameBits.join())}${(length % 36).toString(36)}`;
    } else {
        className = classNameBits.join("-o_O-");
    }

    injectStyleOnce(
        className,
        `.${className}`,
        definitionBits,
        useImportant,
        selectorHandlers
    );

    return className;
}

/* ::
import type { SelectorHandler } from './generate.js';
export type SheetDefinition = { [id:string]: any };
export type SheetDefinitions = SheetDefinition | SheetDefinition[];
type RenderFunction = () => string;
type Extension = {
    selectorHandler: SelectorHandler
};
export type MaybeSheetDefinition = SheetDefinition | false | null | void
*/

const unminifiedHashFn = (str/* : string */, key/* : string */) => `${key}_${hashString(str)}`;

// StyleSheet.create is in a hot path so we want to keep as much logic out of it
// as possible. So, we figure out which hash function to use once, and only
// switch it out via minify() as necessary.
//
// This is in an exported function to make it easier to test.
export const initialHashFn = () => process.env.NODE_ENV === 'production'
    ? hashString
    : unminifiedHashFn;

let hashFn = initialHashFn();

const StyleSheet = {
    create(sheetDefinition /* : SheetDefinition */) /* : Object */ {
        const mappedSheetDefinition = {};
        const keys = Object.keys(sheetDefinition);

        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const val = sheetDefinition[key];
            const stringVal = JSON.stringify(val);

            mappedSheetDefinition[key] = {
                _len: stringVal.length,
                _name: hashFn(stringVal, key),
                _definition: val,
            };
        }

        return mappedSheetDefinition;
    },

    rehydrate(renderedClassNames /* : string[] */ =[]) {
        addRenderedClassNames(renderedClassNames);
    },
};

/**
 * Utilities for using Aphrodite server-side.
 *
 * This can be minified out in client-only bundles by replacing `typeof window`
 * with `"object"`, e.g. via Webpack's DefinePlugin:
 *
 *   new webpack.DefinePlugin({
 *     "typeof window": JSON.stringify("object")
 *   })
 */
const StyleSheetServer = typeof window !== 'undefined'
    ? null
    : {
        renderStatic(renderFunc /* : RenderFunction */) {
            reset();
            startBuffering();
            const html = renderFunc();
            const cssContent = flushToString();

            return {
                html: html,
                css: {
                    content: cssContent,
                    renderedClassNames: getRenderedClassNames(),
                },
            };
        },
    };

/**
 * Utilities for using Aphrodite in tests.
 *
 * Not meant to be used in production.
 */
const StyleSheetTestUtils = process.env.NODE_ENV === 'production'
    ? null
    : {
        /**
         * Prevent styles from being injected into the DOM.
         *
         * This is useful in situations where you'd like to test rendering UI
         * components which use Aphrodite without any of the side-effects of
         * Aphrodite happening. Particularly useful for testing the output of
         * components when you have no DOM, e.g. testing in Node without a fake DOM.
         *
         * Should be paired with a subsequent call to
         * clearBufferAndResumeStyleInjection.
         */
        suppressStyleInjection() {
            reset();
            startBuffering();
        },

        /**
         * Opposite method of preventStyleInject.
         */
        clearBufferAndResumeStyleInjection() {
            reset();
        },

        /**
         * Returns a string of buffered styles which have not been flushed
         *
         * @returns {string}  Buffer of styles which have not yet been flushed.
         */
        getBufferedStyles() {
            return getBufferedStyles();
        }
    };

/**
 * Generate the Aphrodite API exports, with given `selectorHandlers` and
 * `useImportant` state.
 */
export function makeExports(
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */ = defaultSelectorHandlers,
) {
    return {
        StyleSheet: {
            ...StyleSheet,

            /**
             * Returns a version of the exports of Aphrodite (i.e. an object
             * with `css` and `StyleSheet` properties) which have some
             * extensions included.
             *
             * @param {Array.<Object>} extensions: An array of extensions to
             *     add to this instance of Aphrodite. Each object should have a
             *     single property on it, defining which kind of extension to
             *     add.
             * @param {SelectorHandler} [extensions[].selectorHandler]: A
             *     selector handler extension. See `defaultSelectorHandlers` in
             *     generate.js.
             *
             * @returns {Object} An object containing the exports of the new
             *     instance of Aphrodite.
             */
            extend(extensions /* : Extension[] */) {
                const extensionSelectorHandlers = extensions
                // Pull out extensions with a selectorHandler property
                    .map(extension => extension.selectorHandler)
                    // Remove nulls (i.e. extensions without a selectorHandler property).
                    .filter(handler => handler);

                return makeExports(
                    useImportant,
                    selectorHandlers.concat(extensionSelectorHandlers)
                );
            },
        },

        StyleSheetServer,
        StyleSheetTestUtils,

        minify(shouldMinify /* : boolean */) {
            hashFn = shouldMinify ? hashString : unminifiedHashFn;
        },

        css(...styleDefinitions /* : MaybeSheetDefinition[] */) {
            return injectAndGetClassName(
                useImportant, styleDefinitions, selectorHandlers);
        },

        flushToStyleTag,
        injectAndGetClassName,
        defaultSelectorHandlers,
    };
}

const useImportant = false; // Add !important to all style definitions

const Aphrodite = makeExports(useImportant);
StyleSheet = Aphrodite.StyleSheet

const {
    css,
    minify
} = Aphrodite;

export {
    StyleSheet,
    StyleSheetServer,
    StyleSheetTestUtils,
    css,
    minify,
    flushToStyleTag,
    injectAndGetClassName,
    defaultSelectorHandlers,
};

export default Aphrodite
