if (document.cookie.indexOf('flag=') === -1) document.cookie = 'flag=test_fl46'; // For testing
window.addEventListener("load", function() {
  // Main program logic
  var input = document.getElementById('input');
  var output_text = document.getElementById('output_text');
  var output_render = document.getElementById('output_render');
  var hash = location.hash.slice(1) || 'This is the <s>perfect</s><b>best</b>\n' +
      '<script>alert(document.domain);</script>\n' +
      '<i>HTML sanitizer</i>.\n' +
      '<script src="https://example.com"></script>';
  input.value = decodeURIComponent(hash);
  function render() {
    var html = input.value;
    location.hash = encodeURIComponent(html);
    sanitize(html, function (html){
      output_render.innerHTML = html;
      output_text.textContent = html;
    });
  }
  document.getElementById('render').addEventListener("click", render);
  render();

  document.getElementById('submit').addEventListener("click", function() {
    location = '/submit.html?html=' + encodeURIComponent(input.value)
  });
});
