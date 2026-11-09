public class CheckBAgeScoreTests
{
    [Theory(DisplayName = "確認B")]
    [InlineData(16, 50, "ok")]
    [InlineData(15, 100, "ng")]
    [InlineData(70, 50, "ng")]
    [InlineData(69, 49, "ng")]
    [InlineData(69, 50, "ok")]
    [InlineData(16, 49, "ng")]
    public void CheckBAgeScore(int age, int score, string expected)
    {
        Assert.Equal(expected, Answers.CheckBAgeScore(age, score));
    }
}
