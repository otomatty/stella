public class S05MinTests
{
    [Theory(DisplayName = "S05 途中の最小")]
    [InlineData("3 3\n-5\n4\n-1\n", "-2\n1\n")]
    [InlineData("0 0\n", "0\n0\n")]
    public void S05Min(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05Min())));
    }
}
