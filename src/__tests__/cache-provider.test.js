const { getCachedSync } = require("../utils/cache-provider");

describe("Test getCachedSync", () => {
  test("waiting invocations on cache population", async () => {
    const key = `cache-key-001`;
    let flag = 0;
    const [result1, result2, result3] = await Promise.all([
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(10);
          return Promise.resolve("done");
        },
        1
      ),
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(15);
          return Promise.resolve("done");
        },
        1
      ),
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(5);
          return Promise.resolve("done");
        },
        2
      ),
    ]);

    // expect only one cache populating function to be called
    expect(flag).toBe(1);
    expect(result1).toBe("done");
    expect(result2).toBe("done");
    expect(result3).toBe("done");
  });

  test("failed invocation not writing to cache", async () => {
    const key = `cache-key-002`;
    let flag = 0;
    const [result1, result2, result3] = await Promise.all([
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(10);
          return Promise.reject("FAIL");
        },
        1
      ).catch((e) => e),
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(15);
          return Promise.resolve("done");
        },
        1
      ),
      getCachedSync(
        key,
        async () => {
          flag++;
          await sleep(5);
          return Promise.resolve("done");
        },
        2
      ),
    ]);

    // expect only two cache populating function to be called,
    // one fails the other succeeds and the next gets data from cache
    expect(flag).toBe(2);
    expect(result1).toBe("FAIL");
    expect(result2).toBe("done");
    expect(result3).toBe("done");
  });

  test("no waiting invocations", async () => {
    const key = `cache-key-003`;
    let flag = 0;

    const result1 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      2
    );

    const result2 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      2
    );

    const result3 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      2
    );

    // expect only one cache populating function to be called
    expect(flag).toBe(1);
    expect(result1).toBe("done");
    expect(result2).toBe("done");
    expect(result3).toBe("done");
  });

  test("expired cache", async () => {
    const key = `cache-key-004`;
    let flag = 0;

    const result1 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      0.2
    );

    await sleep(300);

    const result2 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      1
    );

    const result3 = await getCachedSync(
      key,
      async () => {
        flag++;
        return Promise.resolve("done");
      },
      1
    );

    // expect two cache populating function to be called (first expires)
    expect(flag).toBe(2);
    expect(result1).toBe("done");
    expect(result2).toBe("done");
    expect(result3).toBe("done");
  });
});

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
