public class S05RankCountTests
{
    [Theory(DisplayName = "S05 順位の人数")]
    [InlineData("4 2\n90 80 80 50\n", "3\n")]
    [InlineData("3 1\n10 20 30\n", "1\n")]
    public void S05RankCount(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05RankCount())));
    }
}
