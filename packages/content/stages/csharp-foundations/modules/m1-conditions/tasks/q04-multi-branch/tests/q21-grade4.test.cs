public class Q21Grade4Tests
{
    [Theory(DisplayName = "Q21 4段階の成績")]
    [InlineData(90, "A")]
    [InlineData(89, "B")]
    [InlineData(70, "B")]
    [InlineData(50, "C")]
    [InlineData(49, "D")]
    public void Q21Grade4(int score, string expected)
    {
        Assert.Equal(expected, Answers.Q21Grade4(score));
    }
}
