public class Q10SumScoresTests
{
    [Theory(DisplayName = "Q10 合計点")]
    [InlineData("5\n50 60 80 59 100\n", "349\n")]
    [InlineData("1\n50\n", "50\n")]
    public void Q10SumScores(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q10SumScores())));
    }
}
