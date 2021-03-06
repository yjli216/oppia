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
 * @fileoverview Service for recommending explorations at the end of an
 * exploration.
 *
 * @author sean@seanlip.org (Sean Lip)
 */

oppia.factory('explorationRecommendationsService', [
  '$http', 'urlService', 'explorationContextService', 'PAGE_CONTEXT',
  'EDITOR_TAB_CONTEXT',
  function(
      $http, urlService, explorationContextService, PAGE_CONTEXT,
      EDITOR_TAB_CONTEXT) {
    var isIframed = urlService.isIframed();
    var isInEditorPage = (
      explorationContextService.getPageContext() === PAGE_CONTEXT.EDITOR);
    var isInEditorPreviewMode = isInEditorPage && (
      explorationContextService.getEditorTabContext() ===
      EDITOR_TAB_CONTEXT.PREVIEW);
    var explorationId = explorationContextService.getExplorationId();

    return {
      getRecommendedSummaryDicts: function(
          authorRecommendedExpIds, successCallback) {
        var recommendationsUrlParams = {
          stringified_author_recommended_ids: JSON.stringify(
            authorRecommendedExpIds)
        };
        if (GLOBALS.collectionId) {
          recommendationsUrlParams.collection_id = GLOBALS.collectionId;
        }
        if (!isInEditorPage) {
          recommendationsUrlParams.include_system_recommendations = 'true';
        }

        $http.get('/explorehandler/recommendations/' + explorationId, {
          params: recommendationsUrlParams
        }).success(function(data) {
          successCallback(data.summaries);
        });
      }
    };
  }
]);
