/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function() {

  var LAZY_LOAD_THRESHOLD = 300,
    $ = document.querySelector.bind(document),

    stories = null,
    storyStart = 0,
    count = 100,
    main = $('main'),
    scrolled = false,
    storyLoadCount = 0,
    localeData = {
      data: {
        intl: {
          locales: 'en-US'
        }
      }
    },

    tmplStory = $('#tmpl-story').textContent,
    tmplStoryDetails = $('#tmpl-story-details').textContent,
    tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent,
    // Header
    header = $('header'),
    headerTitles = header.querySelector('.header__title-wrapper'),
    // Story details overlay
    storyDetails,
    comment,
    commentsElement,
    storyHeader,
    storyContent;

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
      Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
      Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
      Handlebars.compile(tmplStoryDetailsComment);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData (key, details) {

    // This seems odd. Surely we could just select the story
    // directly rather than looping through all of them.
    var storyElements = document.querySelectorAll('.story');

    for (var i = 0; i < storyElements.length; i++) {

      if (storyElements[i].getAttribute('id') === 's-' + key) {

        details.time *= 1000;
        var story = storyElements[i];
        var html = storyTemplate(details);
        story.innerHTML = html;
        story.addEventListener('click', onStoryClick.bind(this, details));
        story.classList.add('clickable');

        // Tick down. When zero we can batch in the next load.
        storyLoadCount--;

      }
    }

    // Colorize on complete.
    // if (storyLoadCount === 0)
    //   colorizeAndScaleStories();
  }

  function onStoryClick(details) {

    // Wait a little time then show the story details.
    setTimeout(showStory.bind(this), 60);

    if (details.url)
      details.urlobj = new URL(details.url);

    // Load templates with fresh details
    var storyDetailsHtml = storyDetailsTemplate(details);
    var commentHtml = storyDetailsCommentTemplate({ by: '', text: 'Loading comment...' });

    var kids = details.kids;
    var closeButton;
    var headerHeight;

    if (!storyDetails) {

      storyDetails = document.createElement('section');
      storyDetails.setAttribute('id', 'story-details');
      storyDetails.innerHTML = storyDetailsHtml;

      document.body.appendChild(storyDetails);
    } else {
      storyDetails.innerHTML = storyDetailsHtml;
    }

    commentsElement = storyDetails.querySelector('.js-comments');
    storyHeader = storyDetails.querySelector('.js-header');
    storyContent = storyDetails.querySelector('.js-content');

    closeButton = storyDetails.querySelector('.js-close');
    closeButton.addEventListener('click', hideStory.bind(this));

    headerHeight = storyHeader.getBoundingClientRect().height;
    storyContent.style.paddingTop = headerHeight + 'px';

    if (typeof kids === 'undefined')
      return;

    for (var k = 0; k < kids.length; k++) {

      comment = document.createElement('aside');
      comment.setAttribute('id', 'sdc-' + kids[k]);
      comment.classList.add('story-details__comment');
      comment.innerHTML = commentHtml;
      commentsElement.appendChild(comment);

      // Update the comment with the live data.
      APP.Data.getStoryComment(kids[k], function(commentDetails) {

        commentDetails.time *= 1000;

        var comment = commentsElement.querySelector(
            '#sdc-' + commentDetails.id);
        comment.innerHTML = storyDetailsCommentTemplate(
            commentDetails,
            localeData);
      });
    }

    storyDetails.dataset.storyId = details.id;
  }

  function showStory() {
    if (!storyDetails)
      return;

    document.body.classList.add('details-active');
    storyDetails.style.opacity = 1;
  }

  function hideStory() {
    document.body.classList.remove('details-active');
    storyDetails.style.opacity = 0;
  }

  /**
   * Does this really add anything? Can we do this kind
   * of work in a cheaper way?
   */
  function colorizeAndScaleStories() {

    var storyElements = document.querySelectorAll('.story');

    // It does seem awfully broad to change all the
    // colors every time!
    for (var s = 0; s < storyElements.length; s++) {

      var story = storyElements[s];
      var score = story.querySelector('.story__score');
      var title = story.querySelector('.story__title');

      // Base the scale on the y position of the score.
      var height = main.offsetHeight;
      var mainPosition = main.getBoundingClientRect();
      var scoreLocation = score.getBoundingClientRect().top -
          document.body.getBoundingClientRect().top;
      var scale = Math.min(1, 1 - (0.05 * ((scoreLocation - 170) / height)));
      var opacity = Math.min(1, 1 - (0.5 * ((scoreLocation - 170) / height)));

      score.style.width = (scale * 40) + 'px';
      score.style.height = (scale * 40) + 'px';
      score.style.lineHeight = (scale * 40) + 'px';

      // Now figure out how wide it is and use that to saturate it.
      scoreLocation = score.getBoundingClientRect();
      var saturation = (100 * ((scoreLocation.width - 38) / 2));

      score.style.backgroundColor = 'hsl(42, ' + saturation + '%, 50%)';
      title.style.opacity = opacity;
    }
  }

  main.addEventListener('touchstart', function(evt) {

    // I just wanted to test what happens if touchstart
    // gets canceled. Hope it doesn't block scrolling on mobiles...
    if (Math.random() > 0.97) {
      evt.preventDefault();
    }

  });

  main.addEventListener('scroll', function() {
    scrolled = true;
  });

  setInterval(function() {
    if(scrolled) {
        scrolled = false;

        var scrollTopCapped = Math.min(70, main.scrollTop),
          scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';

        //colorizeAndScaleStories();

        header.style.height = (156 - scrollTopCapped) + 'px';
        headerTitles.style.webkitTransform = scaleString;
        headerTitles.style.transform = scaleString;

        // Add a shadow to the header.
        if (main.scrollTop > 70)
          document.body.classList.add('raised');
        else
          document.body.classList.remove('raised');

        // Check if we need to load the next batch of stories.
        var loadThreshold = (main.scrollHeight - main.offsetHeight -
            LAZY_LOAD_THRESHOLD);
        if (main.scrollTop > loadThreshold)
          loadStoryBatch();
    }
  }, 100);

  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;

    var end = storyStart + count;
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);
      var story = document.createElement('div');
      story.setAttribute('id', 's-' + key);
      story.classList.add('story');
      story.innerHTML = storyTemplate({
        title: '...',
        score: '-',
        by: '...',
        time: 0
      });
      main.appendChild(story);

      APP.Data.getStoryById(stories[i], onStoryData.bind(this, key));
    }

    storyStart += count;

  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });

})();
