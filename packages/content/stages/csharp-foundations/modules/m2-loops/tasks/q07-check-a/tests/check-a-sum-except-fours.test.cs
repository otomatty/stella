public class CheckASumExceptFoursTests
{
    [Theory(DisplayName = "確認A 4で割り切れる数を除いた合計")]
    [InlineData(5, 11)]
    [InlineData(0, 0)]
    [InlineData(4, 6)]
    [InlineData(8, 24)]
    public void CheckASumExceptFours(int n, int expected)
    {
        Assert.Equal(expected, Answers.CheckASumExceptFours(n));
    }
}
