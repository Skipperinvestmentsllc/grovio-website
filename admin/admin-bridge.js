const root = document.querySelector('#root');

const replaceExactText = (from, to) => {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim() === from) node.nodeValue = node.nodeValue.replace(from, to);
  }
};

function tuneInfluencerWorkspace() {
  document.title = 'Grovio Admin — Influencer Program';
  replaceExactText('Partner administration', 'Grovio Admin');
  replaceExactText('Partner admin', 'Influencer program');
  const topbar = root?.querySelector('.topbar');
  if (topbar && !topbar.querySelector('.admin-home-link')) {
    const link = document.createElement('a');
    link.className = 'admin-home-link';
    link.href = '/admin/';
    link.textContent = 'Admin home';
    link.style.cssText = 'margin-left:auto;color:inherit;font-size:12px;font-weight:700;text-decoration:none;opacity:.78';
    topbar.append(link);
  }
}

new MutationObserver(tuneInfluencerWorkspace).observe(root || document.body, { childList: true, subtree: true, characterData: true });
tuneInfluencerWorkspace();
