IONIC_PROMPT_SUPPORT =  """
Keep in mind if in the following instruction you are also an expert in Ionic, include this libraries, 
otherwise only those related to {{main_language_name}} and other languages not related to Ionic:

- <script type="module" src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js"></script>
- <script nomodule src="https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js"></script>
- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css" />
"""