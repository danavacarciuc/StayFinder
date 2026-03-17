fetch('/api/properties')
  .then(res => res.json())
  .then(data => {
      console.log(data);
  });