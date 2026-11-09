public class Q14RemainderTests
{
    [Theory(DisplayName = "Q14 2つの余り")]
    [InlineData("12 5\n", "2\n")]
    [InlineData("20 6\n", "2\n")]
    [InlineData("9 3\n", "0\n")]
    public void Q14Remainder(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q14Remainder())));
    }
}
