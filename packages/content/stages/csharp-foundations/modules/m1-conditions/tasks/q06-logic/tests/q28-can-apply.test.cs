public class Q28CanApplyTests
{
    [Theory(DisplayName = "Q28 かつ")]
    [InlineData(18, 60, "OK")]
    [InlineData(18, 59, "NG")]
    [InlineData(17, 100, "NG")]
    public void Q28CanApply(int age, int score, string expected)
    {
        Assert.Equal(expected, Answers.Q28CanApply(age, score));
    }
}
