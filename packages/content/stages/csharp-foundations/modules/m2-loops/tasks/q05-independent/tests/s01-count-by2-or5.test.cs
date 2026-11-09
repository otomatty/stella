public class S01CountBy2Or5Tests
{
    [Theory(DisplayName = "S01 対象日の数")]
    [InlineData(10, 6)]
    [InlineData(0, 0)]
    [InlineData(1, 0)]
    [InlineData(2, 1)]
    [InlineData(5, 3)]
    [InlineData(100, 60)]
    public void S01CountBy2Or5(int n, int expected)
    {
        Assert.Equal(expected, Answers.S01CountBy2Or5(n));
    }
}
