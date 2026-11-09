public class Q04EvenOddTests
{
    [Theory(DisplayName = "Q04 even か odd")]
    [InlineData("7\n", "odd\n")]
    [InlineData("8\n", "even\n")]
    [InlineData("0\n", "even\n")]
    public void Q04EvenOdd(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q04EvenOdd())));
    }
}
