public class Q10SumToTests
{
    [Theory(DisplayName = "Q10 1からNの合計")]
    [InlineData("4\n", "10\n")]
    [InlineData("1\n", "1\n")]
    [InlineData("10\n", "55\n")]
    public void Q10SumTo(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q10SumTo())));
    }
}
