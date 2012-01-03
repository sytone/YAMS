---
layout: default
title: News
---

#News

{% for post in site.posts limit:5  %}

    ## {{ post.title }}

    {{ post.content }}

    {% if forloop.rindex > 0 %}<div class="line"></div>{% endif %}

{% endfor %}