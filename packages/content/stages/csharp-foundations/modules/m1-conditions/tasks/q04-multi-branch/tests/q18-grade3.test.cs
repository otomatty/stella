public class Q18Grade3Tests
{
    [Theory(DisplayName = "Q18 3段階の成績")]
    [InlineData(80, "A")]
    [InlineData(79, "B")]
    [InlineData(60, "B")]
    [InlineData(59, "C")]
    public void Q18Grade3(int score, string expected)
    {
        Assert.Equal(expected, Answers.Q18Grade3(score));
    }
}
