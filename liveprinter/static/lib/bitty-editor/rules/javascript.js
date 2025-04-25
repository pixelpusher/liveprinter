window.bitty.rules = {
  comments: /(\/\/.*)/g,
  
  keywords: /\b(new|if|else|do|while|switch|for|of|continue|break|return|typeof|function|var|const|let|\.length)(?=[^\w])/g,

  numbers: /\b(\d+)/g,

  strings: /(".*?"|'.*?'|\`.*?\`)/g
}
