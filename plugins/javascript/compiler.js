var grunt   = require('grunt')
  , fs      = require('fs')
  , path    = require('path')
  , syntax  = require('./syntax')
  , tmpl    = require('./templates/build/tmpl');


/**
 * Compiler
 *
 * @constructor
 */

var Compiler = function() {

  if(typeof cf.programmingLanguageOptions !== 'object') {
    throw new TypeError('cf.programmingLanguageOptions is not set');
  }
  // programming languague options
  // {
  //  node : {boolean},
  //  requirejs : {boolean}
  // }
  this.opts = cf.programmingLanguageOptions;
  // languague wrapper
  this.wrap = null;
  // default namespace
  this.namespace = 'it';
  // new line
  this.newline = '\n';
  // quote
  this.quote = '\'';
  // dot
  this.dot = '.';
  // comma
  this.comma = ',';
  // add
  this.add = ' + ';
  // space
  this.space = ' ';

  // Quiet
  this.quiet = lcf.quiet;
};

/**
 * Compile task
 *
 * @return {void}
 * @public
 */

Compiler.prototype.compile = function() {
  if(!this.wrapper) {
    this.wrap = this._getWrapper();
  }

  for(locale in cf.locales) {
    var content = this.wrap({
      translationMap : this._getTranslationMap(locale)
    });
    fs.writeFileSync(cf.output + '/' + locale + '.js', content);
  }
};

/**
 * Get wrapper for translation content
 *
 * @return {void}
 * @private
 */

Compiler.prototype._getWrapper = function() {
  var wrapper;
  if(this.opts.requirejs && this.opts.node) {
    wrapper = tmpl.requirejsAndNodejsWrapper;
  }
  else if(this.opts.requirejs && !this.opts.node) {
    wrapper = tmpl.requirejsWrapper;
  }
  else if(!this.opts.requirejs && this.opts.node) {
    wrapper = tmpl.nodejsWrapper;
  }
  else {
    wrapper = tmpl.javascriptWrapper;
  }
  return wrapper;
};

/**
 * Get translations
 *
 * @param {string} locale
 *
 * @param {JSONObject}
 * @private
 */

Compiler.prototype._getTranslations = function(locale) {
  // We don't use require, beacuse we can stub fs.readFileSync
  return JSON.parse(fs.readFileSync(path.normalize(cf.localesFolder + '/' + locale + '.json')));
};

/**
 * Get translation map
 *
 * @param {locale} string
 *
 * @return {string} JS String representation fo translation map
 * @private
 */

Compiler.prototype._getTranslationMap = function(locale) {
  // Get translations
  var translations = this._getTranslations(locale);

  // Get Body string
  var n = 0, body = '';
  for(var key in translations) {
    // Append a comma for previous hashes
    if(n !== 0) {
      body += this.comma + this.newline;
    }

    var field = tmpl.JSONTranslationFunctionField({
      key : this._normalizeText(key),
      functionString : this._getFunctionBodyString(translations, key)
    });

    body += field;

    if(!this.quiet) {
      console.log(locale, this._normalizeText(key));
    }

    n++;
  }

  // Store every function in a hash
  return tmpl.mapDeclaration({
    body : body
  });

};

/**
 * Normalize text, ' should be \'
 *
 * @param {string} text
 * @private
 */

Compiler.prototype._normalizeText = function(text) {
  return text
    .replace('\\', 'ESCAPE_CHAR')
    .replace(/'/, '\\\'')
    .replace(/[^\\]ESCAPE_CHAR/g, function(m) {
      return m.replace('ESCAPE_CHAR', '\\\\');
    });
};

/**
 * Get function body string
 *
 * @param {TranslationObject} translation
 *
 * @return {string} function body string
 * @private
 */

Compiler.prototype._getFunctionBodyString = function(translations, key) {
  var str = '';
  if(translations[key].translations.length === 0) {
    str += this._getNonTranslatedFunctionBodyString(this._normalizeText(key));
  } else if(translations[key].translations[0][0] === pcf.CONDITION_IF) {
    str += this._getConditionsString(
      translations[key].translations,
      translations[key].vars
    );
  } else {
    str += this._getNonConditionsFunctionBodyString(
      this._getFormatedTranslatedText(
        translations[key].translations,
        translations[key].vars
      )
    );
  }

  return (new Function([this.namespace], str)).toString();
};

/**
 * Get non-conditions function body string
 *
 * @param {string} key
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getNonConditionsFunctionBodyString = function(string) {
  return tmpl.nonConditionFunctionBody({
    string : string
  });
};

/**
 * Get non-translated function body string
 *
 * @param {string} key
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getNonTranslatedFunctionBodyString = function(key) {
  return tmpl.nonTranslatedFunctionBody({
    key : key
  });
};

/**
 * Get conditions string
 *
 * @param {array} conditions
 * @param {array} vars
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getConditionsString = function(conditions, vars) {
  var str = '';
  conditions.forEach(function(condition) {
    if(condition[0] !== pcf.CONDITION_ELSE) {
      str += this._getConditionString(condition, vars);
      str += this._getAdditionalConditionString(condition, vars);
    }
    else {
      str += this.space + this._getElseStatementString(condition[1]);
    }
  }, this);

  return str;
};

/**
 * Get condition string
 *
 * @param {array} condition
 * @param {array} vars
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getConditionString = function(conditions, vars) {
  var _condition = conditions[0]
    , operand1   = this._getFormatedOperandString(conditions[1], vars)
    , operator   = conditions[2]
    , operand2   = this._getFormatedOperandString(conditions[3], vars);

  // Check if string represent a condition
  if(!syntax.stringIsCondition(operand1, operator, operand2)) {
    throw new TypeError('string does not represent a condition');
  }

  return tmpl.condition({
    condition : _condition,
    operand1  : operand1,
    operator  : operator,
    operand2  : operand2
  });
};

/**
 * Get condition string
 *
 * @param {ConditionArray}
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getAdditionalConditionString = function(conditions, vars) {
  var str = '', index = 4;
  while(conditions[index] === pcf.ADDITIONAL_CONDITION_AND ||
        conditions[index] === pcf.ADDITIONAL_CONDITION_OR) {

    // Declare additional condition
    var additionalCondition = conditions[index];

    // Declare operators and operands
    var operand1 = this._getFormatedOperandString(conditions[index + 1], vars)
      , operator = conditions[index + 2]
      , operand2 = this._getFormatedOperandString(conditions[index + 3], vars);

    // Check if string represent a condition
    if(!syntax.stringIsCondition(operand1, operator, operand2)) {
      throw new TypeError('string does not represent a condition');
    }

    str += this.space + tmpl.additionalCondition({
      additionalCondition : additionalCondition,
      operand1            : operand1,
      operator            : operator,
      operand2            : operand2
    });

    index += 4;
  }

  // append condition body
  str += tmpl.conditionBody({
    string : this._getFormatedTranslatedText(conditions[index], vars)
  });

  return str;
};

/**
 * Get condition body string
 *
 * @param {string} condition body
 * @private
 */

Compiler.prototype._getConditionBodyString = function(string) {
  return tmpl.conditionBody({ string : string });
};

/**
 * Get else statement string
 *
 * @return {string} else statement
 * @private
 */

Compiler.prototype._getElseStatementString = function(string) {
  return tmpl.elseStatement({ string : string });
};

/**
 * Reformats a translation JSON variable to javascript string
 *
 * @param {string} operand
 * @param {array} vars
 *
 * @return {string}
 * @private
 */

Compiler.prototype._getFormatedOperandString = function(operand, vars) {
  if(pcf.SYNTAX_VARIABLE.test(operand)) {
    // Re-formats all vars
    operand = operand.replace('$', '');
    if(vars.indexOf(operand) === -1) {
      throw new TypeError('You have used an undefined variable ' + operand);
    }
    operand = this.namespace + this.dot + operand;
  }

  return operand;
};

/**
 * Get formated translated text
 *
 * @param {string} text
 *
 * @return {string} formated text
 * @private
 */

Compiler.prototype._getFormatedTranslatedText = function(text, vars) {
  var _this = this;
  // Replace quotations
  text = this._normalizeText(text);

  return text.replace(pcf.SYNTAX_VARIABLE_MARKUP, function(match) {
    match = match.substring(2, match.length - 1);
    if(vars.indexOf(match) === -1) {
      throw new TypeError('You have used an undefined variable ' + operand);
    }
    return String.prototype.concat(
      _this.quote,
      _this.add,
      _this.namespace,
      _this.dot,
      match,
      _this.add,
      _this.quote
    );
  });
};

module.exports = Compiler;