// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Directive for the CodeRepl interaction.
 *
 * IMPORTANT NOTE: The naming convention for customization args that are passed
 * into the directive is: the name of the parameter, followed by 'With',
 * followed by the name of the arg.
 */
oppia.directive('oppiaInteractiveCodeRepl', [
  'oppiaHtmlEscaper', 'codeReplRulesService',
  function(oppiaHtmlEscaper, codeReplRulesService) {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: 'interaction/CodeRepl',
      controller: ['$scope', '$attrs', function($scope, $attrs) {
        $scope.language = oppiaHtmlEscaper.escapedJsonToObj(
          $attrs.languageWithValue);
        $scope.placeholder = oppiaHtmlEscaper.escapedJsonToObj(
          $attrs.placeholderWithValue);
        $scope.preCode = oppiaHtmlEscaper.escapedJsonToObj(
          $attrs.preCodeWithValue);
        $scope.postCode = oppiaHtmlEscaper.escapedJsonToObj(
          $attrs.postCodeWithValue);

        $scope.hasLoaded = false;

        // Keep the code string given by the user and the stdout from the
        // evaluation until sending them back to the server.
        $scope.code = ($scope.placeholder || '');
        $scope.output = '';

        $scope.initCodeEditor = function(editor) {
          editor.setValue($scope.code);

          // Options for the ui-codemirror display.
          editor.setOption('lineNumbers', true);
          editor.setOption('indentWithTabs', true);
          editor.setOption('indentUnit', 4);
          editor.setOption('mode', 'python');
          editor.setOption('extraKeys', {
            Tab: function(cm) {
              var spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
              cm.replaceSelection(spaces);
              // Move the cursor to the end of the selection.
              var endSelectionPos = cm.getDoc().getCursor('head');
              cm.getDoc().setCursor(endSelectionPos);
            }
          });

          // NOTE: this is necessary to avoid the textarea being greyed-out.
          setTimeout(function() {
            editor.refresh();
          }, 200);

          editor.on('change', function() {
            $scope.code = editor.getValue();
          });

          // Without this, the editor does not show up correctly on small
          // screens when the user switches to the supplemental interaction.
          $scope.$on('showInteraction', function() {
            setTimeout(function() {
              editor.refresh();
            }, 200);
          });

          $scope.hasLoaded = true;
        };

        // Configure Skulpt.
        Sk.configure({
          output: function(out) {
            // This output function is called continuously throughout the
            // runtime of the script.
            $scope.output += out;
          },
          timeoutMsg: function() {
            $scope.sendResponse('', 'timeout');
          },
          execLimit: 10000
        });

        $scope.runCode = function(codeInput) {
          $scope.code = codeInput;
          $scope.output = '';

          var fullCode = (
            $scope.preCode + '\n' + codeInput + '\n' + $scope.postCode);

          // Evaluate the program asynchronously using Skulpt.
          Sk.misceval.asyncToPromise(function() {
            Sk.importMainWithBody('<stdin>', false, fullCode, true);
          }).then(function() {
            // Finished evaluating.
            $scope.sendResponse('', '');
          }, function(err) {
            if (!(err instanceof Sk.builtin.TimeLimitError)) {
              $scope.sendResponse('', String(err));
            }
          });
        };

        var fixLineNumbers = function(err) {
          var preCodeNumLines = $scope.preCode.split('\n').length;
          var userCodeNumLines = $scope.code.split('\n').length;
          return err.replace(/on line ([0-9]+)/g, function(match, p1) {
            var originalLineNumber = Number(p1);

            return (
              originalLineNumber <= preCodeNumLines ?
              '(on line ' + String(originalLineNumber) +
                ' of exploration creator\'s prepended code)' :
              originalLineNumber <= preCodeNumLines + userCodeNumLines ?
              '(on line ' + String(originalLineNumber - preCodeNumLines) + ')' :
              '(on line ' + String(
                  originalLineNumber - preCodeNumLines - userCodeNumLines) +
                ' of exploration creator\'s appended code)');
          });
        };

        $scope.sendResponse = function(evaluation, err) {
          $scope.evaluation = (evaluation || '');
          $scope.fullError = err ? fixLineNumbers(err) : '';
          $scope.$parent.submitAnswer({
            // Replace tabs with 2 spaces.
            // TODO(sll): Change the default Python indentation to 4 spaces.
            code: $scope.code.replace(/\t/g, '  ') || '',
            output: $scope.output,
            evaluation: $scope.evaluation,
            error: (err || '')
          }, codeReplRulesService);
        };
      }]
    };
  }
]);

oppia.directive('oppiaResponseCodeRepl', [
  'oppiaHtmlEscaper', function(oppiaHtmlEscaper) {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: 'response/CodeRepl',
      controller: [
        '$scope', '$attrs', 'focusService',
        function($scope, $attrs, focusService) {
          $scope.answer = oppiaHtmlEscaper.escapedJsonToObj($attrs.answer);

          if ($scope.answer.error) {
            $scope.errorFocusLabel = focusService.generateFocusLabel();
            focusService.setFocus($scope.errorFocusLabel);
          }
        }
      ]
    };
  }
]);

oppia.directive('oppiaShortResponseCodeRepl', [
  'oppiaHtmlEscaper', function(oppiaHtmlEscaper) {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: 'shortResponse/CodeRepl',
      controller: ['$scope', '$attrs', function($scope, $attrs) {
        $scope.answer = oppiaHtmlEscaper.escapedJsonToObj($attrs.answer);
      }]
    };
  }
]);

oppia.factory('codeReplRulesService', [
    '$filter', 'codeNormalizationService',
    function($filter, codeNormalizationService) {
  return {
    CodeEquals: function(answer, inputs) {
      var normalizedCode =
        codeNormalizationService.getNormalizedCode(answer.code);
      var normalizedExpectedCode =
        codeNormalizationService.getNormalizedCode(inputs.x);
      return normalizedCode == normalizedExpectedCode;
    },
    CodeContains: function(answer, inputs) {
      var normalizedCode =
        codeNormalizationService.getNormalizedCode(answer.code);
      var normalizedSnippet =
        codeNormalizationService.getNormalizedCode(inputs.x);
      return normalizedCode.indexOf(normalizedSnippet) != -1;
    },
    CodeDoesNotContain: function(answer, inputs) {
      var normalizedCode =
        codeNormalizationService.getNormalizedCode(answer.code);
      var normalizedSnippet =
        codeNormalizationService.getNormalizedCode(inputs.x);
      return normalizedCode.indexOf(normalizedSnippet) == -1;
    },
    OutputEquals: function(answer, inputs) {
      var normalizedOutput = $filter('normalizeWhitespace')(answer.output);
      var normalizedExpectedOutput =
        $filter('normalizeWhitespace')(inputs.x);
      return normalizedOutput == normalizedExpectedOutput;
    },
    ResultsInError: function(answer) {
      return !!(answer.error.trim());
    },
    ErrorContains: function(answer, inputs) {
      var normalizedError = $filter('normalizeWhitespace')(answer.error);
      var normalizedSnippet = $filter('normalizeWhitespace')(inputs.x);
      return normalizedError.indexOf(normalizedSnippet) != -1;
    }
  };
}]);
