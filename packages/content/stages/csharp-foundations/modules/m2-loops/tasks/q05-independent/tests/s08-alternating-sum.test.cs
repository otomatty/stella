public class S08AlternatingSumTests
{
    [Theory(DisplayName = "S08 交互の計算")]
    [InlineData(4, -2)]
    [InlineData(5, 3)]
    [InlineData(0, 0)]
    [InlineData(1, 1)]
    [InlineData(100, -50)]
    public void S08AlternatingSum(int n, int expected)
    {
        Assert.Equal(expected, Answers.S08AlternatingSum(n));
    }
}
