public class S03BoughtTests
{
    [Theory(DisplayName = "S03 買えた個数")]
    [InlineData("10 3\n6\n6\n3\n", "2\n1\n")]
    [InlineData("0 1\n1\n", "0\n0\n")]
    [InlineData("10 0\n", "0\n10\n")]
    public void S03Bought(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03Bought())));
    }
}
