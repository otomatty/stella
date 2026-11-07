public class S02ClosestTests
{
    [Theory(DisplayName = "S02 最も近い")]
    [InlineData("2 2\n2 9\n5 10\n", "1\n")]
    [InlineData("1 1\n0\n0\n", "0\n")]
    public void S02Closest(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02Closest())));
    }
}
