const worker = {
  fetch() {
    return new Response("test");
  },
};

export default worker;
