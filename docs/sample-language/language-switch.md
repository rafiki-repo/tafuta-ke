Language Switch Method

Used to provide html websites with multi-language support. It does NOT translate for the user real-time. It is based on the developer and content managers entering the translations.

EXAMPLE:
https://Pamoja.ke is an example of a website using this method.

DEVELOPER:
- Can create tags such as...
<h1 class="fs-3 text-light"><span class="lang" data-lang='{eng:"Starting Point",ksw:"Kituo cha Kuanzia",kmb:"Kyũma kya kwambĩlĩlya"}'>Starting Point</span>&nbsp;</h1>
or 
<h1 class="fs-3 text-light"><span class="lang" data-lang='eng:Starting Point|ksw:Kituo cha Kuanzia|kmb:Kyũma kya kwambĩlĩlya'>Starting Point</span>&nbsp;</h1>

- data-lang attribute is FlexJson (JSON with optional quote and comments as in javascript format or a pipe separated list of language:translation pairs)    

- Creates data content that also has multiple languages per field/tag
const coffees = [
  { mtype: "menu", name: "eng:Together We Can|ksw:Pamoja Tunaweza|kmb:Vamwe Nitutonya|kyu:TÅ©Ä© hamwe tÅ©nooete", 
    desc: '{eng:"This web app provides links to resources in Kenya that are dedicated to helping end unemployment. Learn more and join the movement by visiting pamoja.or.ke",ksw:"Programu hii ya wavuti inaunganisha rasilimali nchini Kenya zinazolenga kukomesha ukosefu wa ajira. Jifunze zaidi na ujiunge na harakati kwa kutembelea pamoja.or.ke",kmb:"This web app provides links to resources in Kenya that are dedicated to helping end unemployment. Learn more and join the movement by visiting pamoja.or.ke (kmb)"}', 
    image: "images/pamoja.png" , href: "https://pamoja.iheartkenya.org"},
  { mtype: "menu", name: "eng:Pamoja > Surveys|ksw:Pamoja > Surveys (ksw)|kmb:Pamoja > Surveys (kmb)", 
    desc: '{eng:"Let your voice be heard. Take a survey or place a vote. Visit survey.pamoja.ke",ksw:"Let your voice be heard. Take a survey and place a vote. Visit survey.pamoja.ke",kmb:"Let your voice be heard. Take a survey and place a vote. Visit survey.pamoja.ke"}', 
    image: "images/surveys.jpg", href: "https://pamoja.iheartkenya.org"  },
    ...

CONTENT MANAGEMENT USER:
- Is presented with multiple fields, one per language on the content management page 
- Can enter as many or as few translations as desired. But should always enter the default language (eng) since a blank translation will use English as a fallback

JAVASCRIPT:
- On page render identifies all tags with class "data-lang"
- For each tag creates a DUPLICATE TAG that is hidden contianing the alternate language translations.
- hides/shows the appropriate tag based on the selected language
- Any content rendered to the HTML page at time of render (javascript dynamic content) is responsible for handling the language switch or setting up the HTML with the data-lang attribute and calling the InitLanguage() function

FUNCTIONS:
- InitLanguage() - Initializes the language switcher - replicates tags with data-lang attributes
- setLanguage() - Sets the language - then calls updateLanguage()
- updateLanguage() - hides/shows the appropriate tag based on the selected language
- 
And that's about it!