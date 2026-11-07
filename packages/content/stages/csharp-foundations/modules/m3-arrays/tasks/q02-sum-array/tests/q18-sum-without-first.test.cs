public class Q18SumWithoutFirstTests
{
    [Fact(DisplayName = "Q18 先頭を除いた合計")]
    public void Q18SumWithoutFirst()
    {
        Assert.Equal(13, Answers.Q18SumWithoutFirst(new int[] { 3, 9, 4 }));
        Assert.Equal(0, Answers.Q18SumWithoutFirst(new int[] { 5 }));
        Assert.Equal(2, Answers.Q18SumWithoutFirst(new int[] { 10, 1, 1 }));
    }
}
